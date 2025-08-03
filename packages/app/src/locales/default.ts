export default {
  common: {
    cancel: "Cancel",
    create: "Create",
    "creating...": "Creating...",
    signOut: "Sign out",
  },
  auth: {
    form: {
      signIn: {
        title: "Welcome back",
        description:
          "To continue building with Hypershape, sign in with your Google account.",
        buttonText: "Continue with Google",
        switch: {
          text: "Already have an account?",
          cta: "Sign in",
        },
      },
      signUp: {
        title: "Create an account",
        description:
          "To start building with Hypershape, sign in with your Google account.",
        buttonText: "Continue with Google",
        switch: {
          text: "Already have an account?",
          cta: "Sign in",
        },
      },
    },
    avatar: {
      organizations: "Organizations",
      createOrganization: {
        title: "Create Organization",
        description: "Enter a name for your new organization.",
        name: {
          label: "Organization name",
          placeholder: "My Organization",
        },
      },
    },
  },
  landing: {
    startBuilding: "Start Building",
  },
  branch: {
    addressBar: {
      screen: {
        size: {
          desktop: "Desktop",
          tablet: "Tablet",
          mobile: "Mobile",
        },
        showPreview: "Show {size} preview",
      },
      path: {
        placeholder: "Go to...",
        tooltip: "Change page",
      },
      refresh: "Refresh",
    },
  },
} as const;
