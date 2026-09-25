/* Motor katmanı bildirimi kendisi göndermez, yalnızca haber verir.
   Uygulama açılışında setNotifier ile gerçek gönderici bağlanır. */
let sink = () => {};
export function setNotifier(fn) { sink = typeof fn === 'function' ? fn : () => {}; }
export function notify(category, title, body, deeplink) {
  return sink(category, title, body, deeplink);
}
