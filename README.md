```
brew install flyctl
pip install git-remote-s3
```

# Github private key

Convert the downloaded private key from Github using the following command, and then paste the output into the `GITHUB_APP_PRIVATE_KEY` environment variable in the `.dev.vars` file.

```
openssl pkcs8 -topk8 -inform PEM -in app-private-key.pem -outform PEM -nocrypt -out app-private-key.pkcs8.pem
```
