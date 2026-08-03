import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

/*
 * Shared timeout-guarded Soup transport turns GJS callback APIs into promises.
 * Providers supply only the HTTP method, endpoint, body/headers, and timeout wording.
 */

export const DEFAULT_HTTP_TIMEOUT_SECONDS = 12;

/* Every helper funnels through this timeout-guarded core so no request can hang a refresh pass forever. */
async function requestBytes(session, message, {timeoutSeconds = DEFAULT_HTTP_TIMEOUT_SECONDS, timeoutMessage = null, headers = null} = {}) {
    if (headers) {
        const requestHeaders = message.get_request_headers();
        Object.entries(headers).forEach(([name, value]) => requestHeaders.replace(name, value));
    }

    const cancellable = new Gio.Cancellable();
    let timeoutId = GLib.timeout_add_seconds(
        GLib.PRIORITY_DEFAULT,
        timeoutSeconds,
        () => {
            timeoutId = 0;
            cancellable.cancel();
            return GLib.SOURCE_REMOVE;
        }
    );

    try {
        return await sendAndRead(session, message, cancellable);
    } catch (error) {
        if (cancellable.is_cancelled())
            throw new Error(timeoutMessage ?? `Timed out after ${timeoutSeconds}s while loading ${message.get_uri().to_string()}.`);

        throw error;
    } finally {
        if (timeoutId !== 0)
            GLib.Source.remove(timeoutId);
    }
}

/* JSON GET endpoints (CNBC, Kraken REST) parse the body directly so callers only see decoded payloads. */
export async function httpGetJson(session, url, options = {}) {
    const bytes = await requestBytes(session, Soup.Message.new('GET', url), options);
    return JSON.parse(new TextDecoder().decode(bytes.get_data()));
}

/* JSON POST endpoints (Hyperliquid info API) share the same transport core as the GET helpers. */
export async function httpPostJson(session, url, body, options = {}) {
    const message = Soup.Message.new('POST', url);
    message.get_request_headers().append('Content-Type', 'application/json');
    message.set_request_body_from_bytes(
        'application/json',
        new GLib.Bytes(new TextEncoder().encode(JSON.stringify(body)))
    );

    const bytes = await requestBytes(session, message, options);
    return JSON.parse(new TextDecoder().decode(bytes.get_data()));
}

/* GJS exposes Soup async methods through callback/finish pairs, so bridge them into the async/await flow here. */
function sendAndRead(session, message, cancellable) {
    return new Promise((resolve, reject) => {
        session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, cancellable, (_session, result) => {
            try {
                resolve(session.send_and_read_finish(result));
            } catch (error) {
                reject(error);
            }
        });
    });
}
