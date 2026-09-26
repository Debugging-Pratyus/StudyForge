"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type AuthMode = "sign-in" | "sign-up";
type Message = { type: "success" | "error"; text: string } | null;

export default function AuthPage() {
	const router = useRouter();
	const [mode, setMode] = useState<AuthMode>("sign-in");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<Message>(null);

	async function handleSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsLoading(true);
		setMessage(null);

		try {
			if (mode === "sign-in") {
				const { error } = await supabase.auth.signInWithPassword({ email, password });

				if (error) throw error;

				router.replace("/");
				router.refresh();
				return;
			}

			const { data, error } = await supabase.auth.signUp({ email, password });

			if (error) throw error;

			setMessage({
				type: "success",
				text: data.session
					? "Your account is ready. Email confirmation is not required."
					: "Your account was created. Check your email to confirm your address before signing in.",
			});
			setPassword("");
		} catch (error) {
			setMessage({
				type: "error",
				text: error instanceof Error ? error.message : "Something went wrong. Please try again.",
			});
		} finally {
			setIsLoading(false);
		}
	}

	function changeMode(nextMode: AuthMode) {
		setMode(nextMode);
		setMessage(null);
		setPassword("");
	}

	return (
		<main className="min-h-screen bg-[#f8f7f4] px-5 py-8 text-[#20252b] sm:px-8 sm:py-12">
			<div className="mx-auto grid min-h-[min(760px,calc(100vh-4rem))] max-w-5xl overflow-hidden rounded-lg border border-[#e9e7e4] bg-white shadow-[0_24px_70px_rgba(32,37,43,0.08)] md:grid-cols-[1.05fr_0.95fr]">
				<section className="relative flex min-h-48 flex-col justify-between overflow-hidden bg-[#222c33] px-7 py-7 text-white sm:px-10 sm:py-9 md:min-h-full md:px-12 md:py-11">
					<div aria-hidden="true" className="pointer-events-none absolute -right-28 -top-28 size-80 rounded-full border border-white/10 shadow-[0_0_0_34px_rgba(255,255,255,0.025),0_0_0_70px_rgba(255,255,255,0.02)]" />
					<Link href="/" className="relative flex w-fit items-center gap-2.5 text-lg font-extrabold tracking-tight" aria-label="StudyForge home">
						<span className="text-2xl leading-none text-[#f27448]">✦</span>
						<span>study<span className="text-[#f27448]">forge</span></span>
					</Link>

					<div className="relative mt-10 max-w-sm md:mt-0">
						<p className="mb-4 text-[10px] font-bold tracking-[0.18em] text-[#f4a67d]">YOUR PERSONAL LEARNING SPACE</p>
						<h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
							Make room for your next big idea.
						</h1>
						<p className="mt-4 max-w-xs text-sm leading-6 text-[#b7c0c3]">
							A quieter place to plan, focus, and keep your momentum going.
						</p>
					</div>

					<p className="relative mt-8 hidden text-xs text-[#89959a] md:block">StudyForge · Built for meaningful progress</p>
				</section>

				<section className="flex items-center justify-center px-6 py-9 sm:px-10 sm:py-12">
					<div className="w-full max-w-sm">
						<p className="text-[10px] font-bold tracking-[0.16em] text-[#afb1b0]">WELCOME TO STUDYFORGE</p>
						<h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#20252b]">
							{mode === "sign-in" ? "Welcome back" : "Create your account"}
						</h2>
						<p className="mt-2 text-sm text-[#8d9299]">
							{mode === "sign-in" ? "Pick up where your learning left off." : "Start building a study rhythm that works for you."}
						</p>

						<div className="mt-7 grid grid-cols-2 rounded-md bg-[#f5f4f1] p-1" aria-label="Authentication options">
							<button
								type="button"
								onClick={() => changeMode("sign-in")}
								aria-pressed={mode === "sign-in"}
								className={`rounded px-3 py-2.5 text-sm font-semibold transition-colors ${mode === "sign-in" ? "bg-white text-[#20252b] shadow-sm" : "text-[#8d9299] hover:text-[#20252b]"}`}
							>
								Sign In
							</button>
							<button
								type="button"
								onClick={() => changeMode("sign-up")}
								aria-pressed={mode === "sign-up"}
								className={`rounded px-3 py-2.5 text-sm font-semibold transition-colors ${mode === "sign-up" ? "bg-white text-[#20252b] shadow-sm" : "text-[#8d9299] hover:text-[#20252b]"}`}
							>
								Create Account
							</button>
						</div>

						<form className="mt-6 space-y-4" onSubmit={handleSubmit}>
							<div>
								<label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-[#4e555b]">Email address</label>
								<input
									id="email"
									type="email"
									autoComplete="email"
									required
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									placeholder="you@example.com"
									className="w-full rounded border border-[#e5e3df] bg-[#fbfaf8] px-3.5 py-3 text-sm outline-none transition focus:border-[#e9a383] focus:ring-4 focus:ring-[#fff2ed]"
								/>
							</div>
							<div>
								<label htmlFor="password" className="mb-1.5 block text-xs font-semibold text-[#4e555b]">Password</label>
								<input
									id="password"
									type="password"
									autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
									minLength={6}
									required
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									placeholder="At least 6 characters"
									className="w-full rounded border border-[#e5e3df] bg-[#fbfaf8] px-3.5 py-3 text-sm outline-none transition focus:border-[#e9a383] focus:ring-4 focus:ring-[#fff2ed]"
								/>
							</div>

							{message && (
								<p
									role={message.type === "error" ? "alert" : "status"}
									className={`rounded border px-3.5 py-3 text-sm leading-5 ${message.type === "error" ? "border-[#f0c8bb] bg-[#fff4ef] text-[#a9472c]" : "border-[#cce6d8] bg-[#f0faf4] text-[#347654]"}`}
								>
									{message.text}
								</p>
							)}

							<button
								type="submit"
								disabled={isLoading}
								className="flex w-full items-center justify-center gap-2 rounded bg-[#f27448] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#df6238] focus:outline-none focus:ring-4 focus:ring-[#f9d5c8] disabled:cursor-wait disabled:opacity-70"
							>
								{isLoading ? "Please wait..." : mode === "sign-in" ? "Sign In" : "Create Account"}
								{!isLoading && <span aria-hidden="true">→</span>}
							</button>
						</form>

						<p className="mt-6 text-center text-xs text-[#9a9da2]">
							{mode === "sign-in" ? "New to StudyForge?" : "Already have an account?"}{" "}
							<button
								type="button"
								onClick={() => changeMode(mode === "sign-in" ? "sign-up" : "sign-in")}
								className="font-semibold text-[#e5683d] hover:text-[#c84e29]"
							>
								{mode === "sign-in" ? "Create an account" : "Sign in"}
							</button>
						</p>
					</div>
				</section>
			</div>
		</main>
	);
}
