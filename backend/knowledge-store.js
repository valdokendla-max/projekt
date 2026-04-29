const crypto = require("crypto");
const fs = require("fs/promises");
const path = require("path");

const KNOWLEDGE_CATEGORIES = ["juhis", "naidis", "fakt", "stiil"];
const KNOWLEDGE_STORE_PATH = path.join(__dirname, "data", "knowledge-store.json");

const DEFAULT_ITEMS = [
  {
    id: "seed-laser-graveerimise-roll",
    title: "Laser Graveerimise roll",
    content:
      "Sa oled lasergraveerimise tehniline assistent. Eelista praktilisi seadeid, testsoovitusi ja ohutusjuhiseid.",
    category: "juhis",
    createdAt: "2026-04-17T00:00:00.000Z",
  },
  {
    id: "seed-soovituse-formaat",
    title: "Soovituse formaat",
    content:
      "Kui kasutaja küsib seadistusi, vasta struktureeritult: kiirus (mm/min), võimsus (%), passid, joonevahe ja air assist.",
    category: "juhis",
    createdAt: "2026-04-17T00:01:00.000Z",
  },
];

let initializedItemsPromise = null;
let mutationQueue = Promise.resolve();

function isKnowledgeCategory(value) {
  return typeof value === "string" && KNOWLEDGE_CATEGORIES.includes(value);
}

function isKnowledgeItem(value) {
  if (!value || typeof value !== "object") {
    return false;
  }

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string" &&
    isKnowledgeCategory(value.category)
  );
}

function normalizeKnowledgeItem(item) {
  return {
    id: String(item.id || "").trim(),
    title: String(item.title || "").trim(),
    content: String(item.content || "").trim(),
    category: item.category,
    createdAt: new Date(item.createdAt).toISOString(),
  };
}

function sortItems(items) {
  return [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

async function persistItems(items) {
  const normalizedItems = sortItems(items.map(normalizeKnowledgeItem));
  const tempFilePath = `${KNOWLEDGE_STORE_PATH}.tmp`;

  await fs.mkdir(path.dirname(KNOWLEDGE_STORE_PATH), { recursive: true });
  await fs.writeFile(tempFilePath, `${JSON.stringify(normalizedItems, null, 2)}\n`, "utf8");
  await fs.rename(tempFilePath, KNOWLEDGE_STORE_PATH);

  return normalizedItems;
}

async function loadItems() {
  await fs.mkdir(path.dirname(KNOWLEDGE_STORE_PATH), { recursive: true });

  try {
    const raw = await fs.readFile(KNOWLEDGE_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed) && parsed.every(isKnowledgeItem)) {
      return sortItems(parsed.map(normalizeKnowledgeItem));
    }
  } catch {
    // Fall through to bootstrap defaults.
  }

  return persistItems(DEFAULT_ITEMS);
}

async function getItemsSnapshot() {
  if (!initializedItemsPromise) {
    initializedItemsPromise = loadItems();
  }

  return initializedItemsPromise;
}

async function runMutation(operation) {
  const mutation = mutationQueue.then(operation);
  mutationQueue = mutation.catch(() => undefined);
  return mutation;
}

class KnowledgeStore {
  async getAll() {
    await mutationQueue;
    const items = await getItemsSnapshot();
    return sortItems(items);
  }

  async getByCategory(category) {
    return (await this.getAll()).filter((item) => item.category === category);
  }

  async getContext() {
    const items = await this.getAll();
    if (items.length === 0) {
      return "";
    }

    const sections = [];
    const juhised = items.filter((item) => item.category === "juhis");
    const naidised = items.filter((item) => item.category === "naidis");
    const faktid = items.filter((item) => item.category === "fakt");
    const stiilid = items.filter((item) => item.category === "stiil");

    if (juhised.length > 0) {
      sections.push(`## Juhised:\n${juhised.map((item) => `- ${item.title}: ${item.content}`).join("\n")}`);
    }

    if (naidised.length > 0) {
      sections.push(`## Näidised:\n${naidised.map((item) => `### ${item.title}\n${item.content}`).join("\n\n")}`);
    }

    if (faktid.length > 0) {
      sections.push(`## Faktid:\n${faktid.map((item) => `- ${item.title}: ${item.content}`).join("\n")}`);
    }

    if (stiilid.length > 0) {
      sections.push(`## Stiilijuhised:\n${stiilid.map((item) => `- ${item.title}: ${item.content}`).join("\n")}`);
    }

    return `\n\n--- TEADMISTEBAAS ---\n${sections.join("\n\n")}`;
  }

  async add(input) {
    if (!isKnowledgeCategory(input?.category)) {
      throw Object.assign(new Error("Kategooria peab olema üks väärtustest: juhis, naidis, fakt või stiil."), {
        status: 400,
      });
    }

    return runMutation(async () => {
      const existingItems = await getItemsSnapshot();
      const item = normalizeKnowledgeItem({
        id: crypto.randomUUID(),
        title: input.title,
        content: input.content,
        category: input.category,
        createdAt: new Date().toISOString(),
      });
      const persistedItems = await persistItems([item, ...existingItems]);
      initializedItemsPromise = Promise.resolve(persistedItems);
      return item;
    });
  }

  async remove(id) {
    return runMutation(async () => {
      const existingItems = await getItemsSnapshot();
      const nextItems = existingItems.filter((item) => item.id !== id);

      if (nextItems.length === existingItems.length) {
        return false;
      }

      const persistedItems = await persistItems(nextItems);
      initializedItemsPromise = Promise.resolve(persistedItems);
      return true;
    });
  }
}

module.exports = {
  KNOWLEDGE_CATEGORIES,
  KNOWLEDGE_STORE_PATH,
  knowledgeStore: new KnowledgeStore(),
};