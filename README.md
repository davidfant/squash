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
