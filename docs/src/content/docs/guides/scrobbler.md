---
title: Setting up the Scrobber
description: How to relay listens submitted to Beat Scrobble to another ListenBrainz compatible server.
---

To use the ListenBrainz API, you need to get your generated api key from the UI.

First, open the settings in your Beat Scrobble instance by clicking on the settings icon or pressing `\`.

Then, you can navigate to the account tab and log in using the default credentials `admin` and `changeme`, or
the credentials you supplied when first running Beat Scrobble using the `Beat Scrobble_DEFAULT_USERNAME` and `Beat Scrobble_DEFAULT_PASSWORD` environment variables.

:::caution
Be sure to change the username and password after logging in for the first time if you used the defaults.
:::

After logging in, open the settings menu again and find the `API Keys` tab. On this tab, you will find the automatically generated API key.

:::note
If you are not running Beat Scrobble on an `https://` connection or `localhost`,  the click-to-copy button will not work. Instead, just click on the key itself to highlight and copy it.
:::

Then, direct any application you want to scrobble data from to `{your_Beat Scrobble_address}/apis/listenbrainz/1` (or `{your_Beat Scrobble_address}/apis/listenbrainz` for some applications) and provide the api key from the UI as the token.

## Set up a relay

Beat Scrobble allows you to relay listens submitted via the ListenBrainz-compatible API to another ListenBrainz-compatible server.
In order to use this feature, all you need to do is set the `Beat Scrobble_ENABLE_LBZ_RELAY`, `Beat Scrobble_LBZ_RELAY_URL`, and `Beat Scrobble_LBZ_RELAY_TOKEN` variables in your environment.
After setting these variables, be sure to restart your Beat Scrobble instance to apply the settings.

Once the relay is configured, Beat Scrobble will automatically forward any requests it recieves on `/apis/listenbrainz/1` to the URL provided in the configuration.

:::note
Be sure to include the full path to the ListenBrainz endpoint of the server you are relaying to in the `Beat Scrobble_LBZ_RELAY_URL`.
For example, to relay to the main ListenBrainz instance, you would set `Beat Scrobble_ENABLE_LBZ_RELAY` to `https://api.listenbrainz.org/1`.
:::
