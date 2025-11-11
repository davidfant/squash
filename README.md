```bash
brew install flyctl
pip install git-remote-s3
```

# Github private key

Convert the downloaded private key from Github using the following command, and then paste the output into the `GITHUB_APP_PRIVATE_KEY` environment variable in the `.dev.vars` file.

```bash
openssl pkcs8 -topk8 -inform PEM -in app-private-key.pem -outform PEM -nocrypt -out app-private-key.pkcs8.pem
```

# flyio-ssh-proxy JWT key

```bash
openssl genrsa -out private.dev.pem 2048
openssl rsa -in private.dev.pem -pubout -out public.dev.pem
```

# TODO

## p0

- [x] Replace old LP w next, move branches to /builds/:id
- [x] Clone screenshot doesn't work
- [x] max height/scfoll in textbox
- [x] attach button on /next not working
- [x] add repo picker to input
- [x] clean up branch preview header (share, menu, history)
- [ ] fly io ssh proxy
- [x] don't show recent prototypes if the list is empty
- [x] loading
- [x] persist e.g. current branch and filtered repo previews
- [ ] get starter repo working
- [x] typing placeholder
- [x] animated presence for ChatInput height?

- [ ] Send a message while agent is running
- [ ] Hooks for tsc
- [ ] Google OAuth
- [ ] Base repo
- [ ] UI for when machine is starting/status
- [ ] Error handling to avoid white screen of death
- [ ] Publish
- [x] Resume conversation/have chat stream once w DO
- [x] Show todo list at the bottom
- [ ] AI gateway for caching/org lvl $ tracking
- [ ] create new chat
- [ ] point and click chat
- [ ] Password protected preview urls

- [x] abort returns 500
- [ ] daytona preview warning
- [x] flickers between previews when e.g. resetting to an older one

For oct 7

- [x] from UI set agent state to clone screenshot
- [x] only run clone screenshot based on state
- [ ] color thief
- [ ] make sure stopping agent works
- [x] claude msgs not getting saved
- [ ] screenshots?
- [x] hide scrollbar in reasoning trace
- [ ] redesign everything
- [x] make invite links make sense
- [ ] figure out what to do about CC tsc
- [ ] look into daytona pty

- errors in one of the branches: https://app.squash.build/prototypes/db41e30a-fc1f-4ce6-b29a-a3e9bcdea926
- internal server error https://app.squash.build/prototypes/2bd3ac7f-4100-49fb-93af-031bc0597cd5
- TS issues: https://app.squash.build/prototypes/6c6068f9-d981-426a-93d5-d001525e9b42
- invite links limited to 1
- git push to repo + delete sandbox
- redux research for a state
- `AI_RetryError: Failed after 3 attempts. Last error: Service Temporarily Unavailable` when analyzing screenshot => jumps directly to implementation next
