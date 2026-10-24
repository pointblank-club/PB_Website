"use client";
import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { years, branches } from "@/lib/constants/dropdownOptions";
import Success from "./success";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import CustomSelect from "@/components/ui/custom-select";
import ReviewInformationForm from "./recruitmentForm/ReviewInformationForm";
import posthog from "posthog-js";

interface FormData {
  name: string;
  email: string;
  whatsapp_number: string;
  college_id: string;
  year_of_study: string;
  branch: string;
  about: string;
}

const RecruitmentForm: React.FC = () => {
  const [isSuccess, setSuccess] = useState<boolean>(false);
  const [mode, setMode] = useState<boolean>(false);
  const [display, setDisplay] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [code, setCode] = useState("");

  const [currentStep, setCurrentStep] = useState<"form" | "review" | "otp">("form");
  const [formDataForSubmission, setFormDataForSubmission] =
    useState<FormData | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    clearErrors,
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      email: "",
      whatsapp_number: "",
      college_id: "",
      year_of_study: "",
      branch: "",
      about: "",
    },
  });

  const watchedYear = watch("year_of_study");

  // Scroll to top when step changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  // Update mode when year changes
  useEffect(() => {
    if (watchedYear === "1st year") {
      setMode(true);
    } else {
      setMode(false);
    }
    setDisplay(true);
  }, [watchedYear]);

  const requestVerificationCode = async (data: FormData): Promise<boolean> => {
    try {
      const response = await fetch(
        "/api/registration/recruitment?action=addRegistration",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();

      if (!response.ok || result.error) {
        toast.error(result.error || "Could not send verification code");
        return false;
      }

      setCode("");
      toast.success("Verification code sent to your email");
      return true;
    } catch {
      toast.error("Could not send verification code");
      return false;
    }
  };

  const onSubmit: SubmitHandler<FormData> = async (data: FormData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (currentStep === "form") {
      // Check for duplicates before proceeding
      try {
        const response = await fetch(
          "/api/registration/recruitment?action=checkDuplicates",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: data.email,
              whatsapp_number: data.whatsapp_number,
              college_id: data.college_id,
            }),
          }
        );

        const result = await response.json();

        if (response.status === 409) {
          // Duplicate found
          const fields = result.duplicates || [];
          const labels: string[] = [];
          if (fields.includes("email")) labels.push("Email");
          if (fields.includes("phone")) labels.push("Phone number");
          if (fields.includes("college_id")) labels.push("College ID");
          toast.error(`${labels.join(", ")} already registered`);
          setIsSubmitting(false);
          return;
        }

        if (!response.ok) {
          // Server error (e.g. 500) — not a duplicate issue
          toast.error(result.error || "Failed to verify details. Please try again.");
          setIsSubmitting(false);
          return;
        }
      } catch {
        toast.error("Failed to verify details. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setFormDataForSubmission(data);
      setCurrentStep("review");
      posthog.capture("recruitment_form_review_opened", {
        year_of_study: data.year_of_study,
        branch: data.branch,
      });
      setIsSubmitting(false);
      return;
    }

    if (currentStep === "review") {
      const sent = await requestVerificationCode(data);
      if (sent) setCurrentStep("otp");
      setIsSubmitting(false);
      return;
    }
  };

  const verifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting || !formDataForSubmission) return;
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/registration/recruitment?action=verifyRegistration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formDataForSubmission.email, code }),
      });
      const result = await response.json();
      if (!response.ok) {
        toast.error(result.error || "Verification failed");
        return;
      }
      setSuccess(true);
      try {
        posthog.capture("recruitment_submitted", {
          year_of_study: formDataForSubmission.year_of_study,
          branch: formDataForSubmission.branch,
        });
      } catch (error) {
        console.error("Recruitment analytics failed:", error);
      }
    } catch {
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (isSubmitting || !formDataForSubmission) return;
    setIsSubmitting(true);
    await requestVerificationCode(formDataForSubmission);
    setIsSubmitting(false);
  };

  if (isSuccess) {
    return (
      <div className="my-9">
        <Success
          message="Registration Successful! Good Luck for the Test!"
          joinLink="https://chat.whatsapp.com/GBk0QHwhtUi35fFAZZGVRI?s=sw&p=a&mlu=4"
        />
      </div>
    );
  }

  const handleEditInformation = () => {
    setCurrentStep("form");
    if (formDataForSubmission) {
      Object.entries(formDataForSubmission).forEach(([key, value]) => {
        setValue(key as keyof FormData, value);
      });
    }
  };

  const handleSubmitRegistration = async (data: FormData) => {
    await onSubmit(data);
  };

  if (currentStep === "review" && formDataForSubmission) {
    return (
      <ReviewInformationForm
        formDataForSubmission={formDataForSubmission}
        isSubmitting={isSubmitting}
        onEditInformation={handleEditInformation}
        onSubmitRegistration={handleSubmitRegistration}
      />
    );
  }

  if (currentStep === "otp" && formDataForSubmission) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <form onSubmit={verifyCode} className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#141414] shadow-2xl border border-white/10 space-y-5">
          <h1 className="text-2xl font-bold text-[#37ff00]">Verify your email</h1>
          <p className="text-white/60">Enter the six digit code sent to {formDataForSubmission.email}. It expires in 10 minutes.</p>
          <div>
            <label htmlFor="recruitment-code" className="block text-sm font-medium text-white/60 mb-2">Verification code</label>
            <input
              id="recruitment-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-3 rounded-xl border border-white/10 bg-pbsurface text-white tracking-widest focus:outline-none focus:border-[#37ff00]/50"
            />
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-[#37ff00] text-black font-semibold rounded-xl py-3 px-6 disabled:opacity-50">
            {isSubmitting ? "Verifying..." : "Verify and complete registration"}
          </button>
          <button type="button" disabled={isSubmitting} onClick={resendCode} className="w-full text-[#37ff00] disabled:opacity-50">
            Resend code
          </button>
          <button type="button" disabled={isSubmitting} onClick={handleEditInformation} className="w-full text-white/60 disabled:opacity-50">
            Edit information
          </button>
        </form>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[900px] mx-auto p-6 sm:p-8 lg:p-10 rounded-3xl bg-[#141414] shadow-2xl border border-white/10">
          <motion.div
            className="mb-4 text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-[#37ff00] to-[#2bcc00] bg-clip-text text-transparent">
              Recruitment Form
            </h1>
          </motion.div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6">
              <motion.div
                className="text-center mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h5 className="text-sm text-white/50">
                  <span className="text-red-500"> * </span>Fields are required
                </h5>
              </motion.div>

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <label className="block text-sm font-medium text-white/60">
                  Full Name<span className="text-red-500"> * </span>
                </label>
                <input
                  {...register("name", {
                    required: "Name is required",
                    validate: (value) =>
                      value.trim().length >= 2 || "Name must be at least 2 characters",
                    maxLength: {
                      value: 100,
                      message: "Name must be less than 100 characters",
                    },
                  })}
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-pbsurface text-white placeholder:text-white/25 focus:outline-none focus:border-[#37ff00]/50 focus:ring-1 focus:ring-[#37ff00]/20 transition-colors"
                />
                {errors.name && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.name.message}
                  </p>
                )}
              </motion.div>

              <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/60">
                    Branch<span className="text-red-500"> * </span>
                  </label>
                  <CustomSelect
                    {...register("branch", {
                      required: "Branch is required",
                    })}
                    options={branches.map((branch) => ({
                      value: branch,
                      label: branch,
                    }))}
                    value={watch("branch") || ""}
                    onChange={(value) => {
                      setValue("branch", value);
                      clearErrors("branch");
                    }}
                    placeholder="Select Branch"
                    error={errors.branch?.message}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white/60">
                    Year of Study<span className="text-red-500"> * </span>
                  </label>
                  <CustomSelect
                    {...register("year_of_study", {
                      required: "Year of study is required",
                    })}
                    options={years.map((year) => ({
                      value: year,
                      label: year,
                    }))}
                    value={watch("year_of_study") || ""}
                    onChange={(value) => {
                      setValue("year_of_study", value);
                      clearErrors("year_of_study");
                    }}
                    placeholder="Select Year"
                    error={errors.year_of_study?.message}
                  />
                </div>
              </motion.div>

              {display && (
                <motion.div
                  className="space-y-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  {mode === true ? (
                    <>
                      <label className="block text-sm font-medium text-white/60">
                        Admission Number (For 1st Years)
                        <span className="text-red-500"> * </span>
                      </label>
                      <input
                        {...register("college_id", {
                          required: "Admission Number is required",
                          pattern: {
                            value: /^[1-9][0-9][A-Z]{4}[0-9]{4}$/,
                            message:
                              "Invalid format. Expected: 19ABCD1234",
                          },
                        })}
                        name="college_id"
                        type="text"
                        placeholder="Enter admission number (e.g., 19ABCD1234)"
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-pbsurface text-white placeholder:text-white/25 focus:outline-none focus:border-[#37ff00]/50 focus:ring-1 focus:ring-[#37ff00]/20 transition-colors"
                      />
                    </>
                  ) : (
                    <>
                      <label className="block text-sm font-medium text-white/60">
                        USN
                        <span className="text-red-500"> * </span>
                      </label>
                      <input
                        {...register("college_id", {
                          required: "USN is required",
                          pattern: {
                            value: /^[1][D][S][1-3][0-9][A-Z]{2}[0-9]{3}$/,
                            message:
                              "Invalid format. Expected: 1DS21CS123",
                          },
                        })}
                        name="college_id"
                        type="text"
                        placeholder="Enter your USN (e.g., 1DS21CS123)"
                        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-pbsurface text-white placeholder:text-white/25 focus:outline-none focus:border-[#37ff00]/50 focus:ring-1 focus:ring-[#37ff00]/20 transition-colors"
                      />
                    </>
                  )}
                  {errors.college_id && (
                    <p className="text-red-400 text-sm mt-1">
                      {errors.college_id.message}
                    </p>
                  )}
                </motion.div>
              )}

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <label className="block text-sm font-medium text-white/60">
                  <div className="flex items-center gap-2">
                    <span>
                      Email<span className="text-red-500"> * </span>
                    </span>
                  </div>
                </label>
                <input
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Invalid email format",
                    },
                  })}
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-pbsurface text-white placeholder:text-white/25 focus:outline-none focus:border-[#37ff00]/50 focus:ring-1 focus:ring-[#37ff00]/20 transition-colors"
                />
                {errors.email && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.email.message}
                  </p>
                )}
              </motion.div>

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 }}
              >
                <label className="block text-sm font-medium text-white/60">
                  WhatsApp Number
                  <span className="text-red-500"> * </span>
                </label>
                <input
                  {...register("whatsapp_number", {
                    required: "WhatsApp Number is required",
                    pattern: {
                      value: /^[6-9]\d{9}$/,
                      message:
                        "Invalid phone number (10 digits starting with 6-9)",
                    },
                  })}
                  maxLength={10}
                  name="whatsapp_number"
                  placeholder="Enter your WhatsApp number"
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-pbsurface text-white placeholder:text-white/25 focus:outline-none focus:border-[#37ff00]/50 focus:ring-1 focus:ring-[#37ff00]/20 transition-colors"
                />
                {errors.whatsapp_number && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.whatsapp_number.message}
                  </p>
                )}
              </motion.div>

              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <label className="block text-sm font-medium text-white/60">
                  Tell us something about yourself (max 150 words)
                  <span className="text-red-500"> * </span>
                </label>
                <textarea
                  {...register("about", {
                    required: "This field is required",
                    minLength: {
                      value: 10,
                      message: "Please write at least 10 characters",
                    },
                    validate: (value) => {
                      const wordCount = value.trim().split(/\s+/).filter(Boolean).length;
                      if (wordCount > 150) return `Maximum 150 words allowed (you have ${wordCount})`;
                      return true;
                    },
                  })}
                  name="about"
                  rows={6}
                  maxLength={1500}
                  placeholder="I am a..."
                  className="w-full px-4 py-3 rounded-xl border border-white/10 bg-pbsurface text-white placeholder:text-white/25 focus:outline-none focus:border-[#37ff00]/50 focus:ring-1 focus:ring-[#37ff00]/20 transition-colors resize-none"
                />
                {errors.about && (
                  <p className="text-red-400 text-sm mt-1">
                    {errors.about.message}
                  </p>
                )}
              </motion.div>

              <motion.div
                className="pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#37ff00] text-black font-semibold rounded-xl py-3 px-6 hover:bg-[#37ff00]/90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm"
                >
                  {isSubmitting ? "Processing..." : "Review Information"}
                </button>
              </motion.div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default RecruitmentForm;
