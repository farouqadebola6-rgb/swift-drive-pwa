import { useState, type FormEvent } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, FileCheck2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type FileField =
  | "profile_photo_url"
  | "vehicle_photo_url"
  | "licence_url"
  | "insurance_doc_url"
  | "vehicle_registration_doc_url";

const FILE_FIELDS: { key: FileField; label: string; help: string; accept: string }[] = [
  { key: "profile_photo_url", label: "Profile photo", help: "Clear face photo (JPG/PNG)", accept: "image/*" },
  { key: "licence_url", label: "Driver's licence", help: "Front of licence card (JPG/PNG/PDF)", accept: "image/*,application/pdf" },
  { key: "vehicle_photo_url", label: "Vehicle photo", help: "Side view with plate visible", accept: "image/*" },
  { key: "vehicle_registration_doc_url", label: "Vehicle registration", help: "Vehicle papers (JPG/PNG/PDF)", accept: "image/*,application/pdf" },
  { key: "insurance_doc_url", label: "Insurance certificate", help: "Current insurance (JPG/PNG/PDF)", accept: "image/*,application/pdf" },
];

type Props = {
  initial: Record<string, unknown> | null;
  onSubmitted: () => void;
};

export function DriverOnboardingForm({ initial, onSubmitted }: Props) {
  const { user } = useAuth();
  const init = initial ?? {};
  const getStr = (k: string): string => {
    const v = init[k];
    return typeof v === "string" ? v : "";
  };

  const [submitting, setSubmitting] = useState(false);
  const [uploads, setUploads] = useState<Record<FileField, string>>({
    profile_photo_url: getStr("profile_photo_url"),
    vehicle_photo_url: getStr("vehicle_photo_url"),
    licence_url: getStr("licence_url"),
    insurance_doc_url: getStr("insurance_doc_url"),
    vehicle_registration_doc_url: getStr("vehicle_registration_doc_url"),
  });
  const [uploading, setUploading] = useState<FileField | null>(null);

  const handleUpload = async (field: FileField, file: File) => {
    if (!user) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error("File too large (max 8MB)");
      return;
    }
    setUploading(field);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${field}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("driver-documents")
      .upload(path, file, { upsert: true, contentType: file.type });
    setUploading(null);
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      return;
    }
    setUploads((u) => ({ ...u, [field]: path }));
    toast.success("File uploaded");
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "").trim();

    const full_name = get("full_name");
    const phone = get("phone");
    const date_of_birth = get("date_of_birth");
    const home_address = get("home_address");
    const nin = get("nin");
    const drivers_license_number = get("drivers_license_number");
    const drivers_license_expiry = get("drivers_license_expiry");
    const emergency_contact_name = get("emergency_contact_name");
    const emergency_contact_phone = get("emergency_contact_phone");
    const vehicle_make = get("vehicle_make");
    const vehicle_model = get("vehicle_model");
    const vehicle_colour = get("vehicle_colour");
    const vehicle_year_raw = get("vehicle_year");
    const vehicle_year = vehicle_year_raw ? Number(vehicle_year_raw) : null;
    const plate_number = get("plate_number");
    const vehicle_registration_number = get("vehicle_registration_number");
    const bank_name = get("bank_name");
    const account_number = get("account_number");

    // Validation
    const required: [string, string][] = [
      [full_name, "Full name"],
      [phone, "Phone"],
      [date_of_birth, "Date of birth"],
      [home_address, "Home address"],
      [nin, "NIN"],
      [drivers_license_number, "Driver's licence number"],
      [drivers_license_expiry, "Licence expiry"],
      [emergency_contact_name, "Emergency contact name"],
      [emergency_contact_phone, "Emergency contact phone"],
      [vehicle_make, "Vehicle make"],
      [vehicle_model, "Vehicle model"],
      [vehicle_colour, "Vehicle colour"],
      [plate_number, "Plate number"],
      [bank_name, "Bank name"],
      [account_number, "Account number"],
    ];
    for (const [v, label] of required) {
      if (!v) {
        toast.error(`${label} is required`);
        return;
      }
    }
    if (!/^\d{11}$/.test(nin)) {
      toast.error("NIN must be 11 digits");
      return;
    }
    if (!/^\d{10}$/.test(account_number)) {
      toast.error("Account number must be 10 digits");
      return;
    }
    if (vehicle_year && (vehicle_year < 1990 || vehicle_year > new Date().getFullYear() + 1)) {
      toast.error("Invalid vehicle year");
      return;
    }
    const missingFiles = FILE_FIELDS.filter(
      (f) => f.key !== "insurance_doc_url" && !uploads[f.key],
    );
    if (missingFiles.length) {
      toast.error(`Please upload: ${missingFiles.map((f) => f.label).join(", ")}`);
      return;
    }

    setSubmitting(true);

    // Update profile (name/phone)
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ full_name, phone })
      .eq("id", user.id);
    if (profErr) {
      setSubmitting(false);
      toast.error(profErr.message);
      return;
    }

    // Update driver record
    const driverPayload = {
      date_of_birth,
      home_address,
      nin,
      drivers_license_number,
      drivers_license_expiry,
      emergency_contact_name,
      emergency_contact_phone,
      vehicle_make,
      vehicle_model,
      vehicle_colour,
      vehicle_year,
      plate_number,
      vehicle_registration_number: vehicle_registration_number || null,
      bank_name,
      account_number,
      profile_photo_url: uploads.profile_photo_url,
      vehicle_photo_url: uploads.vehicle_photo_url,
      licence_url: uploads.licence_url,
      insurance_doc_url: uploads.insurance_doc_url || null,
      vehicle_registration_doc_url: uploads.vehicle_registration_doc_url,
      onboarding_submitted_at: new Date().toISOString(),
    } as never;

    const { error } = await supabase
      .from("drivers")
      .update(driverPayload)
      .eq("user_id", user.id);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Application submitted. We'll review within 24 hours.");
    onSubmitted();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Personal details</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Full legal name" name="full_name" defaultValue={getStr("__full_name")} />
          <Field label="Phone number" name="phone" type="tel" defaultValue={getStr("__phone")} />
          <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={getStr("date_of_birth")} />
          <Field label="National Identification Number (NIN)" name="nin" inputMode="numeric" maxLength={11} defaultValue={getStr("nin")} />
          <div className="md:col-span-2">
            <Label>Home address</Label>
            <Textarea name="home_address" rows={2} defaultValue={getStr("home_address")} />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Driver's licence</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Licence number" name="drivers_license_number" defaultValue={getStr("drivers_license_number")} />
          <Field label="Expiry date" name="drivers_license_expiry" type="date" defaultValue={getStr("drivers_license_expiry")} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Emergency contact</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Contact name" name="emergency_contact_name" defaultValue={getStr("emergency_contact_name")} />
          <Field label="Contact phone" name="emergency_contact_phone" type="tel" defaultValue={getStr("emergency_contact_phone")} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Vehicle</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Make (e.g. Toyota)" name="vehicle_make" defaultValue={getStr("vehicle_make")} />
          <Field label="Model (e.g. Corolla)" name="vehicle_model" defaultValue={getStr("vehicle_model")} />
          <Field label="Colour" name="vehicle_colour" defaultValue={getStr("vehicle_colour")} />
          <Field label="Year" name="vehicle_year" type="number" min={1990} max={new Date().getFullYear() + 1} defaultValue={getStr("vehicle_year")} />
          <Field label="Plate number" name="plate_number" defaultValue={getStr("plate_number")} />
          <Field label="Vehicle registration number (optional)" name="vehicle_registration_number" defaultValue={getStr("vehicle_registration_number")} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold">Payout account</h3>
        <p className="mb-3 text-xs text-muted-foreground">Online ride payouts will be sent here.</p>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Bank name" name="bank_name" defaultValue={getStr("bank_name")} />
          <Field label="Account number" name="account_number" inputMode="numeric" maxLength={10} defaultValue={getStr("account_number")} />
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="mb-1 text-lg font-semibold">Documents</h3>
        <p className="mb-4 text-xs text-muted-foreground">Insurance is optional but recommended. All other docs required.</p>
        <div className="space-y-4">
          {FILE_FIELDS.map((f) => (
            <div key={f.key} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-muted-foreground">{f.help}</p>
                </div>
                {uploads[f.key] ? (
                  <span className="inline-flex items-center gap-1 text-xs text-success">
                    <FileCheck2 className="size-4" /> Uploaded
                  </span>
                ) : null}
              </div>
              <div className="mt-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent">
                  {uploading === f.key ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  <span>{uploads[f.key] ? "Replace file" : "Choose file"}</span>
                  <input
                    type="file"
                    accept={f.accept}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUpload(f.key, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          Submit for verification
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  ...rest
}: { label: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} {...rest} />
    </div>
  );
}
