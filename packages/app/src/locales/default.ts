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
          "To continue prototyping with Squash, sign in with your Google account.",
        buttonText: "Continue with Google",
        switch: {
          text: "Don't have an account?",
          cta: "Sign up",
        },
      },
      signUp: {
        title: "Start Prototyping",
        description:
          "To start prototyping with Squash, sign in with your Google account.",
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
        showPreview: "Show {{size}} preview",
      },
      path: {
        placeholder: "Go to...",
        tooltip: "Change page",
      },
      refresh: "Refresh",
    },
    share: {
      button: "Share",
      dialog: {
        title: "Share",
        description:
          "Publish this prototype to share it with your team, testers, or others.",
        publish: "Publish",
        publishing: "Publishing",
        outdatedWarning:
          "The current prototype is showing an older version. Publish to update to the current version.",
        unpublish: "Unpublish",
        unpublishing: "Unpublishing",
      },
    },
  },
} as const;
