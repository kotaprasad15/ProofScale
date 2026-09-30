import re

with open('apps/web/src/components/LoginView.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Add mode state instead of isSignUp
code = code.replace(
    'const [isSignUp, setIsSignUp] = useState(initialMode === "signup");',
    'const [mode, setMode] = useState<"signin" | "signup" | "forgot_password" | "reset_password">(initialMode === "signup" ? "signup" : "signin");\n  const isSignUp = mode === "signup";\n  const [resetToken, setResetToken] = useState("");'
)

# Replace handleToggleMode
code = code.replace(
    'const handleToggleMode = (signUpMode: boolean) => {',
    'const handleToggleMode = (newMode: "signin" | "signup" | "forgot_password" | "reset_password") => {'
)
code = code.replace(
    'setIsSignUp(signUpMode);',
    'setMode(newMode);'
)

# Add forgot and reset mutations
code = code.replace(
    'const signupMutation = trpc.auth.signup.useMutation();',
    'const signupMutation = trpc.auth.signup.useMutation();\n  const requestResetMutation = trpc.auth.requestPasswordReset.useMutation();\n  const completeResetMutation = trpc.auth.completePasswordReset.useMutation();'
)

code = code.replace(
    'const isSubmitting = loginMutation.isPending || signupMutation.isPending;',
    'const isSubmitting = loginMutation.isPending || signupMutation.isPending || requestResetMutation.isPending || completeResetMutation.isPending;'
)

code = code.replace(
    'setIsSignUp(false);',
    'setMode("signin");'
)

# In handleSubmit, add forgot_password and reset_password branches
submit_code = '''
      if (mode === "forgot_password") {
        if (!email.trim()) return setErrorMsg("Email is required.");
        const res = await requestResetMutation.mutateAsync({ email: email.trim().toLowerCase() });
        if (res.success) {
          if (res.mockToken) setResetToken(res.mockToken);
          setMode("reset_password");
          setErrorMsg(null);
        }
        return;
      }
      
      if (mode === "reset_password") {
        if (!resetToken.trim()) return setErrorMsg("Reset token is required.");
        if (!isPasswordLongEnough) return setErrorMsg("Password must be at least 10 characters.");
        if (!passwordsMatch) return setErrorMsg("Passwords do not match.");
        
        const res = await completeResetMutation.mutateAsync({ token: resetToken, newPassword: password });
        if (res.success) {
          setMode("signin");
          setPassword("");
          setConfirmPassword("");
          setErrorMsg("Password reset successfully. You can now sign in.");
        }
        return;
      }
'''
code = code.replace(
    'if (isSignUp) {',
    submit_code + '\n      if (isSignUp) {'
)

# Add Forgot password link
link_code = '''
              <div className="flex justify-between items-center mb-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)]">
                  Password
                </label>
                {!isSignUp && mode === "signin" && (
                  <button type="button" onClick={() => handleToggleMode("forgot_password")} className="text-[10px] text-[var(--accent)] hover:underline font-mono">
                    Forgot Password?
                  </button>
                )}
              </div>
'''
code = code.replace(
    '<label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">\n                Password\n              </label>',
    link_code
)

# Handle rendering for different modes
# Remove the password field if in forgot_password mode
code = code.replace(
    '<div>\n              <div className="flex justify-between items-center mb-1.5">',
    '{mode !== "forgot_password" && (<div>\n              <div className="flex justify-between items-center mb-1.5">'
)
code = code.replace(
    'className="neo-field !pl-11"\n                />\n              </div>\n            </div>',
    'className="neo-field !pl-11"\n                />\n              </div>\n            </div>)}'
)

# Show token input if in reset_password mode
token_input = '''
            <AnimatePresence mode="popLayout" initial={false}>
              {mode === "reset_password" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: DURATION.fast, ease: EASE.out }}
                >
                  <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">
                    Reset Token
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)]" />
                    <input
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Enter token"
                      className="neo-field !pl-11"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
'''
code = code.replace(
    '<AnimatePresence mode="popLayout" initial={false}>\n              {isSignUp && (',
    token_input + '\n            <AnimatePresence mode="popLayout" initial={false}>\n              {(isSignUp || mode === "reset_password") && ('
)


# Hide mode switch if in forgot/reset mode
code = code.replace(
    '<div className="flex p-1 rounded-xl glass-inset mb-7 relative" role="tablist" aria-label="Authentication mode">',
    '{mode !== "forgot_password" && mode !== "reset_password" && (<div className="flex p-1 rounded-xl glass-inset mb-7 relative" role="tablist" aria-label="Authentication mode">'
)
code = code.replace(
    '</span>\n              </button>\n            ))}\n          </div>',
    '</span>\n              </button>\n            ))}\n          </div>)}'
)

# Back to login button if in forgot/reset
back_code = '''
          {(mode === "forgot_password" || mode === "reset_password") && (
            <button
              type="button"
              onClick={() => handleToggleMode("signin")}
              className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-[var(--text-2)] hover:text-[var(--text-1)] transition cursor-pointer self-start mb-6"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </button>
          )}
'''
code = code.replace(
    '{/* Mode switch */}',
    back_code + '\n          {/* Mode switch */}'
)

# Hide email if in reset password mode
code = code.replace(
    '<div>\n              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">\n                Email\n              </label>',
    '{mode !== "reset_password" && (<div>\n              <label className="block font-mono text-[10px] uppercase tracking-widest text-[var(--text-3)] mb-1.5">\n                Email\n              </label>'
)
code = code.replace(
    '<CheckCircle2 className="w-3 h-3" /> Email available.\n                </p>\n              )}\n            </div>',
    '<CheckCircle2 className="w-3 h-3" /> Email available.\n                </p>\n              )}\n            </div>)}'
)

# Change button text
code = code.replace(
    '{isSignUp ? "Create Account" : "Sign In"}',
    '{mode === "forgot_password" ? "Request Reset" : mode === "reset_password" ? "Reset Password" : isSignUp ? "Create Account" : "Sign In"}'
)

# Change form key
code = code.replace(
    'key={isSignUp ? "signup" : "signin"}',
    'key={mode}'
)

# Update onClick mode arg
code = code.replace(
    'onClick={() => handleToggleMode(mode === "signup")}',
    'onClick={() => handleToggleMode(mode)}'
)

with open('apps/web/src/components/LoginView.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

