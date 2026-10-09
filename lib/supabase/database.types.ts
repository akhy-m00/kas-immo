/**
 * Types de la base Supabase, limités aux tables utilisées par le site.
 *
 * À la place d'une génération complète (`supabase gen types`), on décrit
 * uniquement les tables réellement utilisées, ce qui suffit à typer
 * `supabase.from(...)` sans dupliquer un schéma que la base ne contient pas
 * encore.
 *
 * ⚠️ Si d'autres tables sont ajoutées plus tard, il faudra les compléter ici
 * (ou régénérer le fichier) pour que `supabase.from(...)` reste typé.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Type de nettoyage d'une demande Cleaning.
 *
 * Regroupe l'union TypeScript et la contrainte CHECK
 * `requests_cleaning_type_check` de la base : la seule condition pour
 * `requests.cleaning_type`. Le nom est volontairement present dans les deux
 * couches, parce que la colonne est un `text` et non une enum — TypeScript ne
 * peut donc pas le deduire seul de la base.
 */
export type CleaningType =
  | "bureau"
  | "appartement"
  | "immeuble"
  | "apres_demenagement";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          role: "client" | "admin";
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          role?: "client" | "admin";
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          role?: "client" | "admin";
          created_at?: string;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          type: "appartement" | "maison" | "terrain" | "bureau";
          transaction_type: "location" | "vente";
          /** Prix en FCFA, entier : le FCFA n'a pas de centimes. */
          price: number;
          location: string;
          status: "disponible" | "loue" | "vendu";
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          type: "appartement" | "maison" | "terrain" | "bureau";
          transaction_type: "location" | "vente";
          price: number;
          location: string;
          status?: "disponible" | "loue" | "vendu";
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          type?: "appartement" | "maison" | "terrain" | "bureau";
          transaction_type?: "location" | "vente";
          price?: number;
          location?: string;
          status?: "disponible" | "loue" | "vendu";
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      property_photos: {
        Row: {
          id: string;
          property_id: string;
          url: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          url: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          url?: string;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "property_photos_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
        ];
      };
      cleaning_services: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          /**
           * URL publique d'une photo unique, dans le bucket « cleaning ».
           *
           * Une prestation a une seule image, contrairement à un bien
           * immobilier : le format plat évite une table `cleaning_service_photos`
           * et tout l'appareil de réordonnancement associé.
           */
          image_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      requests: {
        Row: {
          id: string;
          user_id: string | null;
          type: "visite_bien" | "devis_cleaning";
          property_id: string | null;
          cleaning_service_id: string | null;
          /** Type de nettoyage demande. NULL pour une demande immobiliere. */
          cleaning_type: CleaningType | null;
          full_name: string;
          phone: string;
          message: string | null;
          /** Jour de visite souhaite. NULL pour une demande sans rendez-vous. */
          desired_date: string | null;
          /** Heure de visite souhaite. NULL pour une demande sans rendez-vous. */
          desired_time: string | null;
          status: "nouveau" | "en_cours" | "accepte" | "refuse" | "termine";
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          type: "visite_bien" | "devis_cleaning";
          property_id?: string | null;
          cleaning_service_id?: string | null;
          cleaning_type?: CleaningType | null;
          full_name: string;
          phone: string;
          message?: string | null;
          desired_date?: string | null;
          desired_time?: string | null;
          status?: "nouveau" | "en_cours" | "accepte" | "refuse" | "termine";
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          type?: "visite_bien" | "devis_cleaning";
          property_id?: string | null;
          cleaning_service_id?: string | null;
          cleaning_type?: CleaningType | null;
          full_name?: string;
          phone?: string;
          message?: string | null;
          desired_date?: string | null;
          desired_time?: string | null;
          status?: "nouveau" | "en_cours" | "accepte" | "refuse" | "termine";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "requests_property_id_fkey";
            columns: ["property_id"];
            isOneToOne: false;
            referencedRelation: "properties";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "requests_cleaning_service_id_fkey";
            columns: ["cleaning_service_id"];
            isOneToOne: false;
            referencedRelation: "cleaning_services";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: {
      user_role: "client" | "admin";
      property_type: "appartement" | "maison" | "terrain" | "bureau";
      transaction_type: "location" | "vente";
      property_status: "disponible" | "loue" | "vendu";
      request_type: "visite_bien" | "devis_cleaning";
      request_status: "nouveau" | "en_cours" | "accepte" | "refuse" | "termine";
    };
    CompositeTypes: Record<never, never>;
  };
};

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type UserRole = Profile["role"];

export type Property = Database["public"]["Tables"]["properties"]["Row"];
export type PropertyPhoto =
  Database["public"]["Tables"]["property_photos"]["Row"];
export type CleaningService =
  Database["public"]["Tables"]["cleaning_services"]["Row"];

/** Une demande de visite ou de devis, telle que stockée en base. */
export type Request = Database["public"]["Tables"]["requests"]["Row"];

/**
 * Ancien nom de `Request`, conservé tel quel.
 *
 * `Request` entre en conflit avec le type global du même nom dans certains
 * environnements ; cet alias reste donc disponible pour le code existant.
 */
export type PropertyRequest = Request;

/** Le bien joint à une demande, tel que renvoyé par la sélection PostgREST. */
export type RequestProperty = Pick<Property, "id" | "title" | "location" | "status">;

/** La prestation cleaning jointe à une demande. */
export type RequestCleaningService = Pick<
  CleaningService,
  "id" | "title" | "image_url"
>;

export type PropertyType = Database["public"]["Enums"]["property_type"];
export type TransactionType = Database["public"]["Enums"]["transaction_type"];
export type PropertyStatus = Database["public"]["Enums"]["property_status"];
export type RequestType = Database["public"]["Enums"]["request_type"];
export type RequestStatus = Database["public"]["Enums"]["request_status"];
