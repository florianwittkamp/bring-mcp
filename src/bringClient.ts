import Bring from 'bring-shopping';

export class BringClient {
  private bring = new Bring({ mail: process.env.MAIL!, password: process.env.PW! });
  private isLoggedIn = false;
  private tokenExpiresAt: Date | undefined;

  private async _login() {
    try {
      await this.bring.login();
      this.isLoggedIn = true;
      const bearerToken = this.bring['bearerToken'] as string;
      const payload = JSON.parse(Buffer.from(bearerToken.split('.')[1], 'base64').toString());
      this.tokenExpiresAt = new Date((payload.exp - 10000) * 1000);
    } catch (error) {
      this.isLoggedIn = false; // Ensure isLoggedIn is false if login fails
      throw error;
    }
  }

  private async ensureLoggedIn() {
    if (!this.isLoggedIn || !this.tokenExpiresAt || Date.now() > this.tokenExpiresAt?.getTime()) {
      await this._login();
    }
  }

  async loadLists() {
    await this.ensureLoggedIn();
    return this.bring.loadLists();
  }
  async getItems(listUuid: string) {
    await this.ensureLoggedIn();
    const listDetails = await this.bring.getItems(listUuid);

    // Define an interface for the item structure
    interface BringItem {
      name: string;
      specification: string;
      itemId?: string;
      // Add other potential properties if known
    }

    // Helper function to add itemId to items in an array
    const addItemIdToItems = (items: BringItem[]): BringItem[] => {
      if (Array.isArray(items)) {
        return items.map((item) => ({
          ...item,
          itemId: item.name, // Set itemId to be the same as name
        }));
      }
      return items; // Return original if not an array
    };

    // Add itemId to items in purchase and recently arrays
    if (listDetails && typeof listDetails === 'object') {
      // The bring.getItems() response type might not exactly match BringItem initially (e.g. missing itemId)
      // So, we cast to unknown first, then to BringItem[] for the transformation.
      // This acknowledges that we are intentionally reshaping the data.
      if (listDetails.purchase) {
        listDetails.purchase = addItemIdToItems(listDetails.purchase as unknown as BringItem[]);
      }
      if (listDetails.recently) {
        listDetails.recently = addItemIdToItems(listDetails.recently as unknown as BringItem[]);
      }
    }

    return listDetails;
  }
  async getItemsDetails(listUuid: string) {
    await this.ensureLoggedIn();
    return this.bring.getItemsDetails(listUuid);
  }
  async saveItem(listUuid: string, itemName: string, specification: string | null | undefined) {
    await this.ensureLoggedIn();
    return this.bring.saveItem(listUuid, itemName, specification || '');
  }
  async removeItem(listUuid: string, itemId: string) {
    await this.ensureLoggedIn();
    return this.bring.removeItem(listUuid, itemId);
  }
  async moveToRecentList(listUuid: string, itemId: string) {
    await this.ensureLoggedIn();
    return this.bring.moveToRecentList(listUuid, itemId);
  }

  /**
   * Saves an image for an item on a shopping list.
   * @param itemUuid The UUID of the item.
   * @param imageData Base64-encoded image data.
   * @returns A promise that resolves when the image has been saved.
   */
  async saveItemImage(itemUuid: string, imageData: string): Promise<unknown> {
    await this.ensureLoggedIn();
    return this.bring.saveItemImage(itemUuid, { imageData });
  }

  /**
   * Removes an image from an item on a shopping list.
   * @param itemUuid The UUID of the item.
   * @returns A promise that resolves when the image has been removed.
   */
  async removeItemImage(itemUuid: string): Promise<unknown> {
    await this.ensureLoggedIn();
    return this.bring.removeItemImage(itemUuid);
  }

  async getAllUsersFromList(listUuid: string) {
    await this.ensureLoggedIn();
    return this.bring.getAllUsersFromList(listUuid);
  }
  async getUserSettings() {
    await this.ensureLoggedIn();
    return this.bring.getUserSettings();
  }
  async loadTranslations(locale?: string) {
    await this.ensureLoggedIn();
    return this.bring.loadTranslations(locale || 'en-US');
  }
  async loadCatalog(locale: string) {
    await this.ensureLoggedIn();
    return this.bring.loadCatalog(locale);
  }
  async getPendingInvitations() {
    await this.ensureLoggedIn();
    return this.bring.getPendingInvitations();
  }

  async saveItemBatch(listUuid: string, items: { itemName: string; specification?: string | null }[]) {
    await this.ensureLoggedIn();
    const results = [];
    for (const item of items) {
      const result = await this.bring.saveItem(listUuid, item.itemName, item.specification || '');
      results.push(result);
    }
    return results;
  }

  async deleteMultipleItemsFromList(listUuid: string, itemNames: string[]) {
    await this.ensureLoggedIn();
    const results = [];
    for (const itemName of itemNames) {
      // Assuming itemId is the same as itemName for removal,
      // consistent with how getItems structures it and how removeItem is likely used.
      const result = await this.bring.removeItem(listUuid, itemName);
      results.push(result);
    }
    return results;
  }
}
