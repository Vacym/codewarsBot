import PG from './pg.js';

class SqlSet {
  #set;
  #userId;
  #kataId;

  constructor(typeId, id, iterable) {
    this.#set = new Set(iterable);

    if (typeId == 'kata') {
      this.#kataId = id;
    } else if (typeId == 'user') {
      this.#userId = id;
    } else {
      throw "Type should be 'kata' or 'user'";
    }
  }

  async add(value) {
    this.#set.add(value);
    await SqlSetManager.addPair(...this.#combine(value));
  }

  async delete(value) {
    this.#set.delete(value);
    await SqlSetManager.deletePair(...this.#combine(value));
  }

  has(value) {
    return this.#set.has(value);
  }

  toArray() {
    return Array.from(this.#set);
  }

  get size() {
    return this.set.size;
  }

  get id() {
    return this.#userId ?? this.#kataId;
  }

  #combine(value) {
    return [this.#userId ?? value, this.#kataId ?? value];
  }

  [Symbol.iterator]() {
    return this.#set[Symbol.iterator].bind(this.#set)();
  }

  // TODO: create methods:
  //   - clear()
}

class SqlUserSet extends SqlSet {
  constructor(kataId, iterable) {
    super('kata', kataId, iterable);
  }
}
class SqlKataSet extends SqlSet {
  constructor(userId, iterable) {
    super('user', userId, iterable);
  }
}

class SqlSetManager {
  static async getKataSet(userId) {
    const response = await PG.queryColumn(`SELECT kata_id from subscription WHERE user_id = $1`, [
      userId,
    ]);
    const kataSet = new SqlKataSet(userId, response);
    return kataSet;
  }

  static async getUserSet(kataId) {
    const response = await PG.queryColumn(`SELECT user_id from subscription WHERE kata_id = $1`, [
      kataId,
    ]);
    const userSet = new SqlUserSet(kataId, response);
    return userSet;
  }

  static async hasPair(userId, kataId, client) {
    return await client.queryFirst(
      `SELECT $1 IN (SELECT kata_id FROM subscription WHERE user_id = $2)`,
      [kataId, userId]
    );
  }

  static async addPair(userId, kataId, client) {
    await client.query('INSERT INTO subscription (user_id, kata_id) VALUES ($1, $2)', [
      userId,
      kataId,
    ]);
  }

  static async deletePair(userId, kataId, client) {
    await client.query('DELETE FROM subscription WHERE user_id = $1 AND kata_id = $2', [
      userId,
      kataId,
    ]);
  }

  static async getUsersKataCids(userId, client) {
    return await client.queryColumn(
      `SELECT cid FROM katas WHERE id IN (
        SELECT kata_id from subscription WHERE user_id = $1
      )`,
      [userId]
    );
  }

  static async getUsersKataIds(userId, client) {
    return await client.queryColumn(`SELECT kata_id from subscription WHERE user_id = $1`, [
      userId,
    ]);
  }

  static async getKataSetSize(userId, client) {
    return await client.queryFirst(`SELECT COUNT(*) FROM subscription WHERE user_id = $1`, [
      userId,
    ]);
  }

  static async getUserSetSize(kataId, client) {
    return await client.queryFirst(`SELECT COUNT(*) FROM subscription WHERE kata_id = $1`, [
      kataId,
    ]);
  }

  // TODO: create methods:
  //   - clear()
  //   - size
}

export default SqlSetManager;
