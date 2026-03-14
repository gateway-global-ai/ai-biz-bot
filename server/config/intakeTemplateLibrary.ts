export type IntakeInputType =
  | "text"
  | "date"
  | "email"
  | "phone"
  | "address"
  | "select"
  | "multiselect"
  | "number"
  | "signature"
  | "file";

export interface IntakeQuestionField {
  key: string;
  label: string;
  inputType: IntakeInputType;
  required: boolean;
  options?: string[];
  secureOnly?: boolean;
  reviewMode?: "direct" | "review" | "secure_only" | "denied";
  securePolicyId?: string;
  consentType?: string;
}

export interface IntakeWorkflowModule {
  workflowId: string;
  title: string;
  description: string;
  prompts: string[];
  secureFields: string[];
  reviewQueueFields: string[];
  requiredConsents: string[];
  fields: IntakeQuestionField[];
}

export interface IntakeIndustryPack {
  industryPackId: string;
  industry: string;
  version: string;
  modules: IntakeWorkflowModule[];
}

const CHIROPRACTIC_PACK: IntakeIndustryPack = {
  industryPackId: "chiropractic.v1",
  industry: "chiropractic",
  version: "1.0.0",
  modules: [
    {
      workflowId: "chiropractic.newPatientIntake",
      title: "New Patient Intake",
      description: "Collect first-visit patient profile and contact context.",
      prompts: [
        "Let's get your new patient profile started.",
        "I will collect basic details first, then secure items in protected forms.",
      ],
      secureFields: ["dateOfBirth"],
      reviewQueueFields: [],
      requiredConsents: [],
      fields: [
        { key: "firstName", label: "First Name", inputType: "text", required: true, reviewMode: "direct" },
        { key: "lastName", label: "Last Name", inputType: "text", required: true, reviewMode: "direct" },
        {
          key: "dateOfBirth",
          label: "Date of Birth",
          inputType: "date",
          required: true,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.ssn",
        },
        { key: "phone", label: "Phone Number", inputType: "phone", required: true, reviewMode: "direct" },
        { key: "email", label: "Email", inputType: "email", required: false, reviewMode: "direct" },
        { key: "address", label: "Address", inputType: "address", required: false, reviewMode: "direct" },
        {
          key: "emergencyContact",
          label: "Emergency Contact",
          inputType: "text",
          required: false,
          reviewMode: "direct",
        },
        {
          key: "primaryCarePhysician",
          label: "Primary Care Physician (Optional)",
          inputType: "text",
          required: false,
          reviewMode: "direct",
        },
      ],
    },
    {
      workflowId: "chiropractic.insuranceInformation",
      title: "Insurance Information",
      description: "Collect insurance details through secure and review-governed flow.",
      prompts: [
        "I will open a secure form for insurance details.",
        "Insurance updates are queued for staff review before commit.",
      ],
      secureFields: ["policyNumber", "groupNumber", "subscriberDOB"],
      reviewQueueFields: ["insuranceProvider", "subscriberName"],
      requiredConsents: ["insurance_billing_authorization"],
      fields: [
        {
          key: "insuranceProvider",
          label: "Insurance Provider",
          inputType: "text",
          required: true,
          reviewMode: "review",
        },
        {
          key: "policyNumber",
          label: "Policy Number",
          inputType: "text",
          required: true,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.insurance_member_id",
        },
        {
          key: "groupNumber",
          label: "Group Number",
          inputType: "text",
          required: false,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.insurance_member_id",
        },
        {
          key: "insuranceCardUpload",
          label: "Insurance Card Upload",
          inputType: "file",
          required: true,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.insurance_member_id",
        },
        {
          key: "subscriberName",
          label: "Subscriber Name",
          inputType: "text",
          required: true,
          reviewMode: "review",
        },
        {
          key: "subscriberDOB",
          label: "Subscriber DOB",
          inputType: "date",
          required: true,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.ssn",
        },
      ],
    },
    {
      workflowId: "chiropractic.accidentInjuryIntake",
      title: "Accident / Injury Intake",
      description: "Structured accident context for case and claim workflows.",
      prompts: [
        "Let's capture whether this visit is related to an accident.",
        "Attorney and claim details are handled through secure steps.",
      ],
      secureFields: ["claimNumber", "attorneyContact"],
      reviewQueueFields: ["accidentType", "accidentDate", "attorneyInvolved"],
      requiredConsents: ["records_release_authorization"],
      fields: [
        {
          key: "accidentRelatedVisit",
          label: "Is this visit related to an accident?",
          inputType: "select",
          options: ["yes", "no"],
          required: true,
          reviewMode: "direct",
        },
        {
          key: "accidentType",
          label: "Accident Type",
          inputType: "select",
          options: ["auto", "work_injury", "personal_injury", "other"],
          required: false,
          reviewMode: "review",
        },
        { key: "accidentDate", label: "Date of Accident", inputType: "date", required: false, reviewMode: "review" },
        {
          key: "attorneyInvolved",
          label: "Attorney Involved?",
          inputType: "select",
          options: ["yes", "no"],
          required: false,
          reviewMode: "review",
        },
        {
          key: "claimNumber",
          label: "Insurance Claim Number",
          inputType: "text",
          required: false,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.insurance_member_id",
        },
        {
          key: "attorneyContact",
          label: "Attorney Contact Details",
          inputType: "text",
          required: false,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.password_secret",
        },
      ],
    },
    {
      workflowId: "chiropractic.painAssessment",
      title: "Pain Assessment",
      description: "Triage pain profile for visit prep and urgency routing.",
      prompts: [
        "Please describe your current pain so we can prepare your visit.",
        "This helps determine urgency and provider assignment.",
      ],
      secureFields: [],
      reviewQueueFields: [],
      requiredConsents: [],
      fields: [
        { key: "painArea", label: "Area of Pain", inputType: "text", required: true, reviewMode: "direct" },
        { key: "painScale", label: "Pain Scale (1-10)", inputType: "number", required: true, reviewMode: "direct" },
        {
          key: "duration",
          label: "How long have you had this pain?",
          inputType: "text",
          required: true,
          reviewMode: "direct",
        },
        {
          key: "worseFactors",
          label: "What makes it worse?",
          inputType: "text",
          required: false,
          reviewMode: "direct",
        },
        {
          key: "betterFactors",
          label: "What makes it better?",
          inputType: "text",
          required: false,
          reviewMode: "direct",
        },
      ],
    },
    {
      workflowId: "chiropractic.appointmentBooking",
      title: "Appointment Booking",
      description: "Structured appointment request with preferred provider/day/time.",
      prompts: [
        "Let's get your appointment request details.",
        "I will capture provider and time preferences for staff scheduling confirmation.",
      ],
      secureFields: [],
      reviewQueueFields: ["visitType", "preferredDay", "preferredTime"],
      requiredConsents: [],
      fields: [
        {
          key: "visitType",
          label: "Visit Type",
          inputType: "select",
          options: ["new_patient", "follow_up", "urgent"],
          required: true,
          reviewMode: "review",
        },
        {
          key: "preferredProvider",
          label: "Preferred Provider",
          inputType: "text",
          required: false,
          reviewMode: "review",
        },
        {
          key: "preferredDay",
          label: "Preferred Day",
          inputType: "date",
          required: true,
          reviewMode: "review",
        },
        {
          key: "preferredTime",
          label: "Preferred Time",
          inputType: "text",
          required: true,
          reviewMode: "review",
        },
        {
          key: "appointmentReason",
          label: "Appointment Notes",
          inputType: "text",
          required: false,
          reviewMode: "direct",
        },
      ],
    },
    {
      workflowId: "chiropractic.rescheduleCancel",
      title: "Reschedule / Cancel",
      description: "Governed request to reschedule or cancel an existing appointment.",
      prompts: [
        "I can help reschedule or cancel your appointment.",
        "We will capture your preferred replacement time and staff review status.",
      ],
      secureFields: [],
      reviewQueueFields: ["requestType", "existingAppointmentDate", "newPreferredDate", "newPreferredTime"],
      requiredConsents: [],
      fields: [
        {
          key: "requestType",
          label: "Request Type",
          inputType: "select",
          options: ["reschedule", "cancel"],
          required: true,
          reviewMode: "review",
        },
        {
          key: "existingAppointmentDate",
          label: "Current Appointment Date",
          inputType: "date",
          required: true,
          reviewMode: "review",
        },
        {
          key: "newPreferredDate",
          label: "New Preferred Date",
          inputType: "date",
          required: false,
          reviewMode: "review",
        },
        {
          key: "newPreferredTime",
          label: "New Preferred Time",
          inputType: "text",
          required: false,
          reviewMode: "review",
        },
        {
          key: "rescheduleReason",
          label: "Reason (Optional)",
          inputType: "text",
          required: false,
          reviewMode: "direct",
        },
      ],
    },
    {
      workflowId: "chiropractic.consentForms",
      title: "Consent Forms",
      description: "Collect required consents with e-signature-ready schema.",
      prompts: [
        "Before we finalize intake, please complete your required consent forms.",
        "Your consent records are timestamped and stored as compliance artifacts.",
      ],
      secureFields: ["signature"],
      reviewQueueFields: ["consentAcknowledgements"],
      requiredConsents: [
        "hipaa_authorization",
        "insurance_billing_authorization",
        "financial_responsibility_agreement",
        "records_release_authorization",
      ],
      fields: [
        {
          key: "consentAcknowledgements",
          label: "Consent Acknowledgements",
          inputType: "multiselect",
          required: true,
          options: [
            "hipaa_authorization",
            "insurance_billing_authorization",
            "financial_responsibility_agreement",
            "records_release_authorization",
          ],
          reviewMode: "review",
          consentType: "multi",
        },
        {
          key: "signature",
          label: "E-Signature",
          inputType: "signature",
          required: true,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.password_secret",
        },
      ],
    },
  ],
};

const DENTAL_PACK: IntakeIndustryPack = {
  industryPackId: "dental.v1",
  industry: "dental",
  version: "1.0.0",
  modules: [
    {
      workflowId: "dental.newPatientIntake",
      title: "New Patient Intake",
      description: "Collect first-visit dental patient profile and contact context.",
      prompts: [
        "Let's get your new patient profile started.",
        "I will collect basic details first, then secure items in protected forms.",
      ],
      secureFields: ["dateOfBirth"],
      reviewQueueFields: [],
      requiredConsents: [],
      fields: [
        { key: "firstName", label: "First Name", inputType: "text", required: true, reviewMode: "direct" },
        { key: "lastName", label: "Last Name", inputType: "text", required: true, reviewMode: "direct" },
        {
          key: "dateOfBirth",
          label: "Date of Birth",
          inputType: "date",
          required: true,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.ssn",
        },
        { key: "phone", label: "Phone Number", inputType: "phone", required: true, reviewMode: "direct" },
        { key: "email", label: "Email", inputType: "email", required: false, reviewMode: "direct" },
        { key: "address", label: "Address", inputType: "address", required: false, reviewMode: "direct" },
        {
          key: "emergencyContact",
          label: "Emergency Contact",
          inputType: "text",
          required: false,
          reviewMode: "direct",
        },
        {
          key: "previousDentist",
          label: "Previous Dentist (Optional)",
          inputType: "text",
          required: false,
          reviewMode: "direct",
        },
      ],
    },
    {
      workflowId: "dental.insuranceInformation",
      title: "Dental Insurance Information",
      description: "Collect dental insurance details through secure and review-governed flow.",
      prompts: [
        "I will open a secure form for insurance details.",
        "Insurance updates are queued for staff review before commit.",
      ],
      secureFields: ["policyNumber", "groupNumber", "subscriberDOB"],
      reviewQueueFields: ["insuranceProvider", "subscriberName"],
      requiredConsents: ["insurance_billing_authorization"],
      fields: [
        {
          key: "insuranceProvider",
          label: "Insurance Provider",
          inputType: "text",
          required: true,
          reviewMode: "review",
        },
        {
          key: "policyNumber",
          label: "Policy Number",
          inputType: "text",
          required: true,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.insurance_member_id",
        },
        {
          key: "groupNumber",
          label: "Group Number",
          inputType: "text",
          required: false,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.insurance_member_id",
        },
        {
          key: "insuranceCardUpload",
          label: "Insurance Card Upload",
          inputType: "file",
          required: true,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.insurance_member_id",
        },
        {
          key: "subscriberName",
          label: "Subscriber Name",
          inputType: "text",
          required: true,
          reviewMode: "review",
        },
        {
          key: "subscriberDOB",
          label: "Subscriber DOB",
          inputType: "date",
          required: true,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.ssn",
        },
      ],
    },
    {
      workflowId: "dental.issueAssessment",
      title: "Dental Issue Assessment",
      description: "Triage dental issues for visit prep and urgency routing.",
      prompts: [
        "Please describe your current dental issue so we can prepare your visit.",
        "This helps determine urgency and provider assignment.",
      ],
      secureFields: [],
      reviewQueueFields: [],
      requiredConsents: [],
      fields: [
        { key: "issueType", label: "Type of Issue", inputType: "select", options: ["pain", "cleaning", "cosmetic", "broken_tooth", "other"], required: true, reviewMode: "direct" },
        { key: "painScale", label: "Pain Scale (1-10)", inputType: "number", required: true, reviewMode: "direct" },
        {
          key: "duration",
          label: "How long have you had this issue?",
          inputType: "text",
          required: true,
          reviewMode: "direct",
        },
        {
          key: "sensitivity",
          label: "Sensitive to hot/cold?",
          inputType: "select",
          options: ["yes", "no", "unsure"],
          required: false,
          reviewMode: "direct",
        },
      ],
    },
    {
      workflowId: "dental.appointmentBooking",
      title: "Appointment Booking",
      description: "Structured appointment request with preferred provider/day/time.",
      prompts: [
        "Let's get your appointment request details.",
        "I will capture provider and time preferences for staff scheduling confirmation.",
      ],
      secureFields: [],
      reviewQueueFields: ["visitType", "preferredDay", "preferredTime"],
      requiredConsents: [],
      fields: [
        {
          key: "visitType",
          label: "Visit Type",
          inputType: "select",
          options: ["new_patient", "cleaning", "emergency", "consultation"],
          required: true,
          reviewMode: "review",
        },
        {
          key: "preferredProvider",
          label: "Preferred Dentist/Hygienist",
          inputType: "text",
          required: false,
          reviewMode: "review",
        },
        {
          key: "preferredDay",
          label: "Preferred Day",
          inputType: "date",
          required: true,
          reviewMode: "review",
        },
        {
          key: "preferredTime",
          label: "Preferred Time",
          inputType: "text",
          required: true,
          reviewMode: "review",
        },
        {
          key: "appointmentReason",
          label: "Appointment Notes",
          inputType: "text",
          required: false,
          reviewMode: "direct",
        },
      ],
    },
    {
      workflowId: "dental.rescheduleCancel",
      title: "Reschedule / Cancel",
      description: "Governed request to reschedule or cancel an existing appointment.",
      prompts: [
        "I can help reschedule or cancel your appointment.",
        "We will capture your preferred replacement time and staff review status.",
      ],
      secureFields: [],
      reviewQueueFields: ["requestType", "existingAppointmentDate", "newPreferredDate", "newPreferredTime"],
      requiredConsents: [],
      fields: [
        {
          key: "requestType",
          label: "Request Type",
          inputType: "select",
          options: ["reschedule", "cancel"],
          required: true,
          reviewMode: "review",
        },
        {
          key: "existingAppointmentDate",
          label: "Current Appointment Date",
          inputType: "date",
          required: true,
          reviewMode: "review",
        },
        {
          key: "newPreferredDate",
          label: "New Preferred Date",
          inputType: "date",
          required: false,
          reviewMode: "review",
        },
        {
          key: "newPreferredTime",
          label: "New Preferred Time",
          inputType: "text",
          required: false,
          reviewMode: "review",
        },
        {
          key: "rescheduleReason",
          label: "Reason (Optional)",
          inputType: "text",
          required: false,
          reviewMode: "direct",
        },
      ],
    },
    {
      workflowId: "dental.consentForms",
      title: "Consent Forms",
      description: "Collect required consents with e-signature-ready schema.",
      prompts: [
        "Before we finalize intake, please complete your required consent forms.",
        "Your consent records are timestamped and stored as compliance artifacts.",
      ],
      secureFields: ["signature"],
      reviewQueueFields: ["consentAcknowledgements"],
      requiredConsents: [
        "hipaa_authorization",
        "insurance_billing_authorization",
        "financial_responsibility_agreement",
        "records_release_authorization",
      ],
      fields: [
        {
          key: "consentAcknowledgements",
          label: "Consent Acknowledgements",
          inputType: "multiselect",
          required: true,
          options: [
            "hipaa_authorization",
            "insurance_billing_authorization",
            "financial_responsibility_agreement",
            "records_release_authorization",
          ],
          reviewMode: "review",
          consentType: "multi",
        },
        {
          key: "signature",
          label: "E-Signature",
          inputType: "signature",
          required: true,
          secureOnly: true,
          reviewMode: "secure_only",
          securePolicyId: "sensitive.password_secret",
        },
      ],
    },
  ],
};

const PACKS: Record<string, IntakeIndustryPack> = {
  chiropractic: CHIROPRACTIC_PACK,
  dental: DENTAL_PACK,
};

export function getIntakeIndustryPack(industry: string): IntakeIndustryPack | null {
  const key = industry.toLowerCase().trim();
  return PACKS[key] ?? null;
}
