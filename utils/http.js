import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Soup from 'gi://Soup?version=3.0';

/*
 * Shared Soup HTTP transport helpers.
 *
 * GJS exposes Soup async methods through callback/finish pairs, and each REST
 * provider used to re-implement the same promise bridging and timeout guard
 * locally. Centralizing transport here keeps provider modules focused on wire
 * formats and lets every REST call share one timeout policy.
 */

export const DEFAULT_HTTP_TIMEOUT_SECONDS = 12;

/* Every helper funnels through this timeout-guarded core so no request can hang a refresh pass forever. */
export async function requestBytes(session, message, {timeoutSeconds = DEFAULT_HTTP_TIMEOUT_SECONDS, timeoutMessage = null} = {}) {
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

/* Text endpoints (Stooq CSV) read the whole body as trimmed UTF-8. */
export async function httpGetText(session, url, options = {}) {
    const bytes = await requestBytes(session, Soup.Message.new('GET', url), options);
    return new TextDecoder().decode(bytes.get_data()).trim();
}

/* JSON GET endpoints (Kraken REST) parse the body directly so callers only see decoded payloads. */
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
