# command line interface

## Documentation

Create ngrok account: [https://dashboard.ngrok.com/](https://dashboard.ngrok.com/).

Go here and retrieve your ngrok auth token [https://dashboard.ngrok.com/get-started/your-authtoken](https://dashboard.ngrok.com/get-started/your-authtoken).

Create `.env` file and insert your ngrok auth token.

```
NGROK_AUTHTOKEN=MY_NGROK_AUTH_TOKEN
```

Then run the ngrok: `npm ./start-ngrok.js`.
