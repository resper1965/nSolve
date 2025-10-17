import Link from "next/link";
import { NSolveLogo } from "@/components/ness-logo";
import { LoginForm } from "../../_components/login-form";

export default function LoginV2() {
  return (
    <>
      <div className="mx-auto flex w-full flex-col justify-center space-y-8 sm:w-[380px]">
        <div className="space-y-4 text-center">
          <NSolveLogo size="lg" className="justify-center flex" />
          <div className="space-y-2">
            <h1 className="text-2xl font-medium text-[#EEF1F6]">Sign in to your account</h1>
            <p className="text-[#9CA3AF] text-sm">Enter your credentials to access the dashboard</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <LoginForm />
        </div>
        
        <div className="text-center">
          <p className="text-[#9CA3AF] text-sm">
            Don&apos;t have an account?{" "}
            <Link className="text-[#00ADE8] hover:text-[#0096CC] transition-colors" href="register">
              Contact your administrator
            </Link>
          </p>
        </div>
      </div>

      <div className="absolute bottom-5 left-0 right-0 flex justify-center px-10">
        <div className="text-[#9CA3AF] text-xs">
          © {new Date().getFullYear()} <span className="text-[#EEF1F6]">ness</span>
          <span className="text-[#00ADE8]">.</span> All rights reserved.
        </div>
      </div>
    </>
  );
}
