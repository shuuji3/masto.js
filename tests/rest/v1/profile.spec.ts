import { getMockImage } from "../../../test-utils/image";

describe("profile", () => {
  it("can remove avatar", () => {
    sessions.use(async (client) => {
      const profile1 = await client.rest.v1.accounts.updateCredentials({
        avatar: await getMockImage(),
      });
      await client.rest.v1.profile.avatar.remove();
      const profile2 = await client.rest.v1.accounts.verifyCredentials();
      expect(profile1.avatar).not.toBe(profile2.avatar);
    });
  });

  it("can remove header", () => {
    sessions.use(async (client) => {
      const profile1 = await client.rest.v1.accounts.updateCredentials({
        header: await getMockImage(),
      });
      await client.rest.v1.profile.header.remove();
      const profile2 = await client.rest.v1.accounts.verifyCredentials();
      expect(profile1.header).not.toBe(profile2.header);
    });
  });
});
