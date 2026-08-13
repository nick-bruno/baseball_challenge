export const TARGET = 9;
export const INNINGS = 9;

export type Item = "beer" | "hotdog";

export const ITEMS: Item[] = ["beer", "hotdog"];

export const ITEM_LABEL: Record<Item, string> = {
  beer: "Beers",
  hotdog: "Hot Dogs",
};

export const ITEM_EMOJI: Record<Item, string> = {
  beer: "🍺",
  hotdog: "🌭",
};

export type Room = {
  id: string;
  code: string;
  name: string | null;
  current_inning: number;
  status: "active" | "finished";
  host_participant_id: string | null;
  created_at: string;
  finished_at: string | null;
};

export type Participant = {
  id: string;
  room_id: string;
  auth_user_id: string;
  display_name: string;
  joined_at: string;
};

export type ConsumptionEvent = {
  id: string;
  room_id: string;
  participant_id: string;
  item: Item;
  delta: 1 | -1;
  inning: number;
  client_event_id: string;
  created_at: string;
};
