export type Category = { id: string; name: string; sort_order: number };

export type Dish = {
  id: string;
  category_id: string;
  name: string;
  evening_and_holidays_only: boolean;
  is_custom: boolean;
};

export type Outing = {
  id: string;
  label: string;
  created_by: string | null;
  closed_at: string | null;
};

export type Round = {
  id: string;
  outing_id: string;
  round_number: number;
  status: "open" | "closed";
};

export type Order = {
  id: string;
  round_id: string;
  user_id: string;
  dish_id: string;
  quantity: number;
};

export type HaloufAwardRow = {
  user_id: string;
  display_name: string;
  total_quantity: number;
  outings_count: number;
  avg_per_outing: number;
};
