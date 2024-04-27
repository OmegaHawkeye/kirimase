import { eta } from "../../../../eta.js";
import { ComponentLibType } from "../../../../types.js";
import { formatFilePath, getFilePaths } from "../../../filePaths/index.js";
import { readConfigFile } from "../../../../utils.js";

const generateMiddlewareTs = () => {
  return `
  import { authMiddleware } from "@clerk/nextjs";

  // This example protects all routes including api/trpc routes
  // Please edit this to allow other routes to be public as needed.
  // See https://clerk.com/docs/references/nextjs/auth-middleware for more information about configuring your middleware
  export default authMiddleware({ ignoredRoutes: ["/"] });

  export const config = {
    matcher: ['/((?!.+\\\\\.[\\\\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
  };`;
};

const generateSignInPageTs = () => {
  return `
  import { SignIn } from "@clerk/nextjs";

  export default function Page() {
    return (
      <main className="grid place-items-center pt-4">
        <SignIn redirectUrl={"/dashboard"} />
      </main>
    );
  }`;
};

const generateSignUpPageTs = () => {
  return `
  import { SignUp } from "@clerk/nextjs";

  export default function Page() {
    return (
      <main className="grid place-items-center pt-4">
        <SignUp redirectUrl={"/dashboard"} />
      </main>
    );
  }`;
};

/**
 * (TODO) Generates the home page with a user button template
 * @link https://github.com/nicoalbanese/kirimase/blob/master/src/commands/add/auth/clerk/generators.ts
 */
const homePageWithUserButton = (componentLib: ComponentLibType | null) => {
  const { shared } = getFilePaths();
  const { alias } = readConfigFile();

  // TODO: Implement the homePageWithUserButton template
  return eta.render("auth/general/homePageWithUserButton.eta", {
    formatFilePath,
    alias,
    shared,
    componentLib,
  });
};
const generateAuthUtilsTs = () => {
  return `
  import { redirect } from "next/navigation";

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
    // find out more about setting up 'sessionClaims' (custom sessions) here: https://clerk.com/docs/backend-requests/making/custom-session-token
    const { userId, sessionClaims } = auth();
    if (userId) {
      return {
        session: {
          user: {
            id: userId,
            name: \`\${sessionClaims?.firstName} \${sessionClaims?.lastName}\`,
            email: sessionClaims?.email,
          },
        },
      } as AuthSession;
    } else {
      return { session: null };
    }
  };`;
};

export const clerkGenerators = {
  generateMiddlewareTs,
  generateSignInPageTs,
  generateSignUpPageTs,
  homePageWithUserButton,
  generateAuthUtilsTs,
};
