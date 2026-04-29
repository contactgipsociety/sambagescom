import { supabase } from "@/integrations/supabase/client";

/**
 * Réinitialise la base de données en supprimant toutes les données métier.
 * Les paramètres de l'entreprise sont préservés.
 */
export const resetDatabase = async (options: {
  documents?: boolean;
  products?: boolean;
  parties?: boolean;
  entries?: boolean;
}) => {
  const { documents, products, parties, entries } = options;

  // Ordre important : documents d'abord (référencent parties)
  if (documents) {
    await supabase.from("documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }
  if (entries) {
    await supabase.from("accounting_entries").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }
  if (products) {
    await supabase.from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }
  if (parties) {
    await supabase.from("parties").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  }
};
