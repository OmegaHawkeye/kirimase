import { readConfigFile } from "../../../../utils.js";
import { formatFilePath, getFilePaths } from "../../../filePaths/index.js";
import { eta } from "../../../../eta.js";

const generateViewsAndComponents = (withShadCn: boolean) => {
  const signUpPage = generateSignUpPage(withShadCn);
  const signInPage = generateSignInPage(withShadCn);
  const authFormComponent = generateAuthFormComponent(withShadCn);
  const signOutButtonComponent = generateSignOutButtonComponent(withShadCn);
  const homePage = generateHomePage(withShadCn);
  const loadingPage = generateLoadingPage(withShadCn);

  return {
    signUpPage,
    signInPage,
    signOutButtonComponent,
    authFormComponent,
    homePage,
    loadingPage,
  };
};

export const generateSupabaseHelpers = () => {
  const { shared } = getFilePaths();
  return eta.render("auth/supabase/supabaseHelper.eta", {
    shared,
    formatFilePath,
  });
};

export const generateSignInPage = (withShadCn: boolean) => {
  const { supabase, shared } = getFilePaths();
  const { alias } = readConfigFile();

  return eta.render("auth/supabase/signInPage.eta", {
    formatFilePath,
    alias,
    supabase,
    shared,
    withShadCn,
  });
};

export const generateSignUpPage = (withShadCn: boolean) => {
  const { supabase, shared } = getFilePaths();
  const { alias } = readConfigFile();

  return eta.render("auth/supabase/signUpPage.eta", {
    formatFilePath,
    alias,
    supabase,
    shared,
    withShadCn,
  });
};

export const generateSignOutButtonComponent = (withShadCn: boolean) => {
  const { alias } = readConfigFile();
  const { shared } = getFilePaths();
  return eta.render("auth/supabase/signOutButton.eta", {
    formatFilePath,
    alias,
    shared,
    withShadCn,
  });
};

export const generateAuthFormComponent = (withShadCn: boolean) => {
  const { alias } = readConfigFile();
  const { shared } = getFilePaths();
  return eta.render("auth/supabase/authForm.eta", {
    formatFilePath,
    alias,
    shared,
    withShadCn,
  });
};

export const generateHomePage = (withShadCn: boolean) => {
  const { supabase, shared } = getFilePaths();
  return `
    import { SignOutButton } from "${formatFilePath(
      supabase.signOutButtonComponent,
      {
        removeExtension: true,
        prefix: "alias",
      }
    )}";
    import { getUserAuth } from "${formatFilePath(shared.auth.authUtils, {
      prefix: "alias",
      removeExtension: true,
    })}";

    export default async function Home() {
    const { session } = await getUserAuth();
    return (
        <main className="">
            <h1 className="text-2xl font-bold my-2">Profile</h1>
            <pre className="${
              withShadCn ? "bg-secondary" : "bg-neutral-100 dark:bg-neutral-800"
            } p-4 rounded-lg my-2">
                {JSON.stringify(session, null, 2)}
            </pre>
            <SignOutButton />
        </main>
    );
    }
`;
};
export const generateLoadingPage = (withShadCn: boolean) => {
  return `
    export default function Loading() {
    return (
        <div className="grid place-items-center animate-pulse ${
          withShadCn ? "text-muted-foreground" : "text-neutral-300"
        } p-4">
        <div role="status">
            <svg
            aria-hidden="true"
            className="w-8 h-8 ${
              withShadCn
                ? "text-muted-foreground fill-muted"
                : "text-neutral-200 dark:text-neutral-600 fill-neutral-600"
            } animate-spin"
            viewBox="0 0 100 101"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            >
            <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
            />
            <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                fill="currentFill"
            />
            </svg>
            <span className="sr-only">Loading...</span>
        </div>
        </div>
    );
    }
    `;
};

export const generateApiRoutes = () => {
  const { supabase } = getFilePaths();
  return `
        import { createSupabaseApiRouteClient } from "${formatFilePath(
          supabase.libSupabaseAuthHelpers,
          {
            removeExtension: true,
            prefix: "alias",
          }
        )}";
        import { NextRequest, NextResponse } from "next/server";

        export async function GET(request: NextRequest) {
            const requestUrl = new URL(request.url);
            const code = requestUrl.searchParams.get("code");

            if (code) {
                const supabase = createSupabaseApiRouteClient();
                await supabase.auth.exchangeCodeForSession(code);
            }

            // URL to redirect to after sign in process completes
            return NextResponse.redirect(requestUrl.origin);
        }
    `;
};

const generateAuthDirFiles = () => {
  const { supabase } = getFilePaths();
  const utilsTs = `
    import { redirect } from "next/navigation";
    import { createSupabaseServerComponentClient } from "${formatFilePath(
      supabase.libSupabaseAuthHelpers,
      {
        removeExtension: true,
        prefix: "alias",
      }
    )}";

    export const getServerSession = async () => {
        const supabase = createSupabaseServerComponentClient();
        const {
            data: { session }
        } = await supabase.auth.getSession()

        return { session };
    };

    export const getServerUser = async () => {
        const supabase = createSupabaseServerComponentClient()
        const {
            data: { user }
        } = await supabase.auth.getUser()

        return { user }
    }

    export type AuthSession = {
        session: {
            user: {
                id: string;
                name?: string;
                email?: string;
            };
        } | null;
    };

    export const getUserAuth = async () => {
        const { user } = await getServerUser();

        if (user) {
            return {
                session: {
                    user: {
                        id: user.id,
                        name: user.user_metadata?.name ?? '', // user.user_metadata.name is only populated after the user has updated their name once. Supabase doesn't store the users name by default.
                        email: user.email,
                    },
                },
            } as AuthSession;
        } else {
            return { session: null };
        }
    };

    export const checkAuth = async () => {
        const { session } = await getUserAuth();

        if (!session) redirect("/sign-in");
    };
`;

  const actionTs = `
    "use server"
    import { redirect } from "next/navigation";
    import { createSupabaseServerActionClient } from "${formatFilePath(
      supabase.libSupabaseAuthHelpers,
      {
        removeExtension: true,
        prefix: "alias",
      }
    )}"
    import { zfd } from 'zod-form-data'
    import { z } from 'zod'

    export type State = {
        error?: string
        message?: string
        redirectTo?: string
    } | null

    export const signOut = async () => {
        const supabase = createSupabaseServerActionClient()
        await supabase.auth.signOut()
        redirect('/')
    }

    const signInSchema = zfd.formData({
        email: zfd.text(
            z
                .string({
                    required_error: 'You have to enter an email address.',
                })
                .email({ message: 'Please provide a valid email address' })
        ),
        password: zfd.text(
            z
                .string({ required_error: 'You have to enter a password' })
                .min(8, 'Password must be longer than 8 characters.')
        ),
    })

    export const signIn = async (state: State, formData: FormData) => {
        const supabase = createSupabaseServerActionClient()
        const res = signUpSchema.safeParse(formData)

        if (!res.success) {
            const errors = res.error.flatten()
            const errorMessage = Object.values(errors.fieldErrors)
                .join('\\n')
                .replace(',', '\\n')
            return { error: errorMessage }
        }

        const { email, password } = signInSchema.parse(formData)

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) return { error: error.message }

        return { redirectTo: '/' }
    }

    const signUpSchema = zfd.formData({
        email: zfd.text(
            z
                .string({
                    required_error: 'You have to enter an email address.',
                })
                .email({ message: 'Please provide a valid email address' })
        ),
        password: zfd.text(
            z
                .string({ required_error: 'You have to enter a password' })
                .min(8, 'Password must be longer than 8 characters.')
        ),
    })

    export const signUp = async (state: State, formData: FormData) => {
        const supabase = createSupabaseServerActionClient()
        const res = signUpSchema.safeParse(formData)

        if (!res.success) {
            const errors = res.error.flatten()
            const errorMessage = Object.values(errors.fieldErrors)
                .join('\\n')
                .replace(',', '\\n')
            return { error: errorMessage }
        }

        const { email, password } = signUpSchema.parse(formData)

        const { error } = await supabase.auth.signUp({ email, password })

        if (error) return { error: error.message }

        return { redirectTo: '/' }
    }

    export const updateUserName = async (state: State, formData: FormData) => {
        const supabase = createSupabaseServerActionClient()
        const username = formData.get('name') as string

        const { error } = await supabase.auth.updateUser({ data: { username } })

        if (error) return { error: error.message }

        return { message: 'Successfully updated username!', ...state }
    }

    export const updateEmail = async (state: State, formData: FormData) => {
        const supabase = createSupabaseServerActionClient()
        const email = formData.get('email') as string

        const { error } = await supabase.auth.updateUser({ email })

        if (error) return { error: error.message }

        return { message: 'Successfully updated email!', ...state }
    }`;

  return { utilsTs, actionTs };
};

const generateMiddleware = () => {
  const { supabase } = getFilePaths();
  return `
    import { type NextRequest } from "next/server";
    import { updateSession } from "${formatFilePath(
      supabase.libSupabaseAuthHelpers,
      {
        removeExtension: true,
        prefix: "alias",
      }
    )}";

    export async function middleware(request: NextRequest) {
        return await updateSession(request);
    }

    export const config = {
        matcher: [
            /*
            * Match all request paths except:
            * - _next/static (static files)
            * - _next/image (image optimization files)
            * - favicon.ico (favicon file)
            * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
            * Feel free to modify this pattern to include more paths.
            */
            "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
        ],
    }; `;
};

export const supabaseGenerators = {
  generateMiddleware,
  generateViewsAndComponents,
  generateSupabaseHelpers,
  generateApiRoutes,
  generateAuthDirFiles,
};
