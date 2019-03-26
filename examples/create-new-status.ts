// tslint:disable no-console
import Masto from '../src';

// For more inromation:
// https://github.com/neet/masto.js/blob/master/docs/classes/_client_mastodon_.mastodon.md#createstatus
(async () => {
  const masto = await Masto.login({
    uri: 'https://example.com',
    accessToken: 'YOUR TOKEN',
  });

  masto.createStatus({
    status: 'Toot from TypeScript',
    visibility: 'direct',
  }).then((newStatus) => {
    console.log(newStatus.data);
  });
})()
