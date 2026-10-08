export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abandoned_history: {
        Row: {
          customer_email: string | null
          customer_name: string | null
          id: string
          order_id: string | null
          reminded_at: string | null
        }
        Insert: {
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          order_id?: string | null
          reminded_at?: string | null
        }
        Update: {
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          order_id?: string | null
          reminded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          action_type: string
          created_at: string | null
          details: Json | null
          id: string
          resource: string
          resource_id: string | null
          user_id: string | null
          user_role: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource: string
          resource_id?: string | null
          user_id?: string | null
          user_role: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          resource?: string
          resource_id?: string | null
          user_id?: string | null
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          address_line: string
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          label: string | null
          region: string | null
          user_id: string
        }
        Insert: {
          address_line: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          region?: string | null
          user_id: string
        }
        Update: {
          address_line?: string
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          label?: string | null
          region?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ai_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_turns: {
        Row: {
          cache_read_tokens: number | null
          cache_write_tokens: number | null
          channel: string
          conversation_id: string | null
          cost_usd: number | null
          created_at: string | null
          id: string
          input_tokens: number | null
          model: string | null
          output_tokens: number | null
          thinking_tokens: number | null
          tool_calls: Json | null
          user_id: string | null
        }
        Insert: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          channel?: string
          conversation_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          thinking_tokens?: number | null
          tool_calls?: Json | null
          user_id?: string | null
        }
        Update: {
          cache_read_tokens?: number | null
          cache_write_tokens?: number | null
          channel?: string
          conversation_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          id?: string
          input_tokens?: number | null
          model?: string | null
          output_tokens?: number | null
          thinking_tokens?: number | null
          tool_calls?: Json | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_turns_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_turns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      automatic_discounts: {
        Row: {
          applies_to: string
          created_at: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean | null
          min_order_amount: number | null
          min_quantity: number | null
          quantity_scope: string
          starts_at: string | null
          target_category_ids: string[] | null
          target_product_ids: string[] | null
          title: string
          usage_count: number | null
        }
        Insert: {
          applies_to: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          min_order_amount?: number | null
          min_quantity?: number | null
          quantity_scope?: string
          starts_at?: string | null
          target_category_ids?: string[] | null
          target_product_ids?: string[] | null
          title: string
          usage_count?: number | null
        }
        Update: {
          applies_to?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean | null
          min_order_amount?: number | null
          min_quantity?: number | null
          quantity_scope?: string
          starts_at?: string | null
          target_category_ids?: string[] | null
          target_product_ids?: string[] | null
          title?: string
          usage_count?: number | null
        }
        Relationships: []
      }
      back_in_stock_requests: {
        Row: {
          created_at: string | null
          email: string
          id: string
          product_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          product_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          product_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "back_in_stock_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          address: string | null
          business_name: string
          contact: string | null
          email: string | null
          id: string
          logo_url: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          business_name?: string
          contact?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          business_name?: string
          contact?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_wholesale: boolean
          name: string
          preorder_enabled: boolean
          preorder_estimated_weeks: number
          product_count: number
          slug: string
          sort_order: number | null
          wholesale_tier_1_price: number | null
          wholesale_tier_2_price: number | null
          wholesale_tier_3_price: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_wholesale?: boolean
          name: string
          preorder_enabled?: boolean
          preorder_estimated_weeks?: number
          product_count?: number
          slug: string
          sort_order?: number | null
          wholesale_tier_1_price?: number | null
          wholesale_tier_2_price?: number | null
          wholesale_tier_3_price?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_wholesale?: boolean
          name?: string
          preorder_enabled?: boolean
          preorder_estimated_weeks?: number
          product_count?: number
          slug?: string
          sort_order?: number | null
          wholesale_tier_1_price?: number | null
          wholesale_tier_2_price?: number | null
          wholesale_tier_3_price?: number | null
        }
        Relationships: []
      }
      communication_templates: {
        Row: {
          body_text: string
          channel: string
          created_at: string | null
          event_type: string
          greeting: string | null
          id: string
          subject: string | null
          updated_at: string | null
        }
        Insert: {
          body_text: string
          channel: string
          created_at?: string | null
          event_type: string
          greeting?: string | null
          id?: string
          subject?: string | null
          updated_at?: string | null
        }
        Update: {
          body_text?: string
          channel?: string
          created_at?: string | null
          event_type?: string
          greeting?: string | null
          id?: string
          subject?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      contact_inquiries: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          email: string
          first_name: string
          id: string
          ip_address: string | null
          last_name: string | null
          message: string
          order_number: string | null
          replied_at: string | null
          status: string
          submitted_at: string
          topic: string
        }
        Insert: {
          email: string
          first_name: string
          id?: string
          ip_address?: string | null
          last_name?: string | null
          message: string
          order_number?: string | null
          replied_at?: string | null
          status?: string
          submitted_at?: string
          topic: string
        }
        Update: {
          email?: string
          first_name?: string
          id?: string
          ip_address?: string | null
          last_name?: string | null
          message?: string
          order_number?: string | null
          replied_at?: string | null
          status?: string
          submitted_at?: string
          topic?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          address: string | null
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          source: string
          subscribed_status: boolean
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          id?: string
          name?: string
          phone?: string | null
          source?: string
          subscribed_status?: boolean
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          source?: string
          subscribed_status?: boolean
        }
        Relationships: []
      }
      coupons: {
        Row: {
          buy_quantity: number | null
          category_id: string | null
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          free_shipping: boolean | null
          get_quantity: number | null
          id: string
          is_active: boolean | null
          min_order_value: number | null
          single_use_per_customer: boolean | null
          target_category_id: string | null
          usage_limit: number | null
          used_count: number | null
          value: number | null
        }
        Insert: {
          buy_quantity?: number | null
          category_id?: string | null
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          free_shipping?: boolean | null
          get_quantity?: number | null
          id?: string
          is_active?: boolean | null
          min_order_value?: number | null
          single_use_per_customer?: boolean | null
          target_category_id?: string | null
          usage_limit?: number | null
          used_count?: number | null
          value?: number | null
        }
        Update: {
          buy_quantity?: number | null
          category_id?: string | null
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          free_shipping?: boolean | null
          get_quantity?: number | null
          id?: string
          is_active?: boolean | null
          min_order_value?: number | null
          single_use_per_customer?: boolean | null
          target_category_id?: string | null
          usage_limit?: number | null
          used_count?: number | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "coupons_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupons_target_category_id_fkey"
            columns: ["target_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_requests: {
        Row: {
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          customizations: Json | null
          details: string | null
          id: string
          reference_product: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customizations?: Json | null
          details?: string | null
          id?: string
          reference_product?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customizations?: Json | null
          details?: string | null
          id?: string
          reference_product?: string | null
          status?: string | null
        }
        Relationships: []
      }
      customer_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          email: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          email?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          email?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string | null
        }
        Relationships: []
      }
      discount_holds: {
        Row: {
          amount: number
          code_id: string
          created_at: string
          expires_at: string
          id: string
          kind: string
          order_id: string | null
          pos_session_id: string | null
        }
        Insert: {
          amount?: number
          code_id: string
          created_at?: string
          expires_at: string
          id?: string
          kind: string
          order_id?: string | null
          pos_session_id?: string | null
        }
        Update: {
          amount?: number
          code_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          kind?: string
          order_id?: string | null
          pos_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_holds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_holds_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          amount: number
          created_at: string | null
          customer_email: string | null
          customer_name: string | null
          id: string
          line_items: Json | null
          notes: string | null
          status: string
          tax_rate: number | null
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          line_items?: Json | null
          notes?: string | null
          status?: string
          tax_rate?: number | null
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_email?: string | null
          customer_name?: string | null
          id?: string
          line_items?: Json | null
          notes?: string | null
          status?: string
          tax_rate?: number | null
          type?: string
        }
        Relationships: []
      }
      featured_categories: {
        Row: {
          category_id: string | null
          created_at: string
          custom_image_url: string | null
          custom_label: string | null
          enabled: boolean
          id: string
          item_count_override: number | null
          position: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          custom_image_url?: string | null
          custom_label?: string | null
          enabled?: boolean
          id?: string
          item_count_override?: number | null
          position?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          custom_image_url?: string | null
          custom_label?: string | null
          enabled?: boolean
          id?: string
          item_count_override?: number | null
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_redemptions: {
        Row: {
          amount_used: number
          balance_after: number
          balance_before: number
          gift_card_id: string
          id: string
          order_id: string | null
          redeemed_at: string
          redeemed_by: string | null
        }
        Insert: {
          amount_used: number
          balance_after: number
          balance_before: number
          gift_card_id: string
          id?: string
          order_id?: string | null
          redeemed_at?: string
          redeemed_by?: string | null
        }
        Update: {
          amount_used?: number
          balance_after?: number
          balance_before?: number
          gift_card_id?: string
          id?: string
          order_id?: string | null
          redeemed_at?: string
          redeemed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_redemptions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          code: string
          created_at: string | null
          currency: string
          delivery_date: string | null
          delivery_mode: string
          expires_at: string | null
          id: string
          initial_value: number
          is_active: boolean | null
          message: string | null
          order_id: string | null
          purchased_by_email: string | null
          recipient_email: string | null
          recipient_name: string | null
          remaining_value: number
          sender_name: string | null
          sent_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string | null
          currency?: string
          delivery_date?: string | null
          delivery_mode?: string
          expires_at?: string | null
          id?: string
          initial_value: number
          is_active?: boolean | null
          message?: string | null
          order_id?: string | null
          purchased_by_email?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          remaining_value: number
          sender_name?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string | null
          currency?: string
          delivery_date?: string | null
          delivery_mode?: string
          expires_at?: string | null
          id?: string
          initial_value?: number
          is_active?: boolean | null
          message?: string | null
          order_id?: string | null
          purchased_by_email?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          remaining_value?: number
          sender_name?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          body_text: string | null
          created_at: string
          cta_primary_label: string
          cta_primary_url: string
          cta_secondary_label: string | null
          cta_secondary_url: string | null
          enabled: boolean
          eyebrow: string | null
          headline_line1: string
          headline_line2: string | null
          headline_line3: string | null
          id: string
          image_storage_path: string | null
          image_url: string | null
          overlay_opacity: number
          position: number
          updated_at: string
        }
        Insert: {
          body_text?: string | null
          created_at?: string
          cta_primary_label?: string
          cta_primary_url?: string
          cta_secondary_label?: string | null
          cta_secondary_url?: string | null
          enabled?: boolean
          eyebrow?: string | null
          headline_line1: string
          headline_line2?: string | null
          headline_line3?: string | null
          id?: string
          image_storage_path?: string | null
          image_url?: string | null
          overlay_opacity?: number
          position?: number
          updated_at?: string
        }
        Update: {
          body_text?: string | null
          created_at?: string
          cta_primary_label?: string
          cta_primary_url?: string
          cta_secondary_label?: string | null
          cta_secondary_url?: string | null
          enabled?: boolean
          eyebrow?: string | null
          headline_line1?: string
          headline_line2?: string | null
          headline_line3?: string | null
          id?: string
          image_storage_path?: string | null
          image_url?: string | null
          overlay_opacity?: number
          position?: number
          updated_at?: string
        }
        Relationships: []
      }
      homepage_reviews: {
        Row: {
          avatar_color: string
          avatar_initials: string | null
          created_at: string
          enabled: boolean
          id: string
          position: number
          review_text: string
          reviewer_location: string | null
          reviewer_name: string
          star_rating: number
          updated_at: string
        }
        Insert: {
          avatar_color?: string
          avatar_initials?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          review_text: string
          reviewer_location?: string | null
          reviewer_name: string
          star_rating?: number
          updated_at?: string
        }
        Update: {
          avatar_color?: string
          avatar_initials?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          position?: number
          review_text?: string
          reviewer_location?: string | null
          reviewer_name?: string
          star_rating?: number
          updated_at?: string
        }
        Relationships: []
      }
      message_log: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          direction: string
          id: string
          media_url: string | null
          message_type: string | null
          wa_message_id: string | null
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          direction: string
          id?: string
          media_url?: string | null
          message_type?: string | null
          wa_message_id?: string | null
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          direction?: string
          id?: string
          media_url?: string | null
          message_type?: string | null
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_log_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subs: {
        Row: {
          created_at: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      newsletter_subscribers: {
        Row: {
          coupon_code: string | null
          coupon_sent_at: string | null
          email: string
          id: string
          source: string | null
          subscribed_at: string
        }
        Insert: {
          coupon_code?: string | null
          coupon_sent_at?: string | null
          email: string
          id?: string
          source?: string | null
          subscribed_at?: string
        }
        Update: {
          coupon_code?: string | null
          coupon_sent_at?: string | null
          email?: string
          id?: string
          source?: string | null
          subscribed_at?: string
        }
        Relationships: []
      }
      online_reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "online_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "online_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_rider_id: string | null
          auto_discount_amount: number | null
          auto_discount_title: string | null
          created_at: string | null
          customer_email: string | null
          customer_id: string | null
          customer_metadata: Json | null
          customer_name: string | null
          customer_phone: string | null
          delivery_fee: number
          delivery_method: string | null
          delivery_zone: string | null
          discount_amount: number
          discount_code: string | null
          fulfillment_status: string | null
          has_preorder: boolean
          id: string
          is_custom_order: boolean | null
          is_mixed_order: boolean | null
          items: Json | null
          notes: string | null
          packed_by: string | null
          paid_at: string | null
          payment_method: string
          payment_status: string | null
          paystack_charged: number | null
          paystack_fee: number | null
          paystack_reference: string | null
          recorded_by: string | null
          ref: string | null
          shipping_address: Json | null
          source: string | null
          status: string | null
          total_amount: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          assigned_rider_id?: string | null
          auto_discount_amount?: number | null
          auto_discount_title?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_metadata?: Json | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          delivery_method?: string | null
          delivery_zone?: string | null
          discount_amount?: number
          discount_code?: string | null
          fulfillment_status?: string | null
          has_preorder?: boolean
          id?: string
          is_custom_order?: boolean | null
          is_mixed_order?: boolean | null
          items?: Json | null
          notes?: string | null
          packed_by?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_status?: string | null
          paystack_charged?: number | null
          paystack_fee?: number | null
          paystack_reference?: string | null
          recorded_by?: string | null
          ref?: string | null
          shipping_address?: Json | null
          source?: string | null
          status?: string | null
          total_amount: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_rider_id?: string | null
          auto_discount_amount?: number | null
          auto_discount_title?: string | null
          created_at?: string | null
          customer_email?: string | null
          customer_id?: string | null
          customer_metadata?: Json | null
          customer_name?: string | null
          customer_phone?: string | null
          delivery_fee?: number
          delivery_method?: string | null
          delivery_zone?: string | null
          discount_amount?: number
          discount_code?: string | null
          fulfillment_status?: string | null
          has_preorder?: boolean
          id?: string
          is_custom_order?: boolean | null
          is_mixed_order?: boolean | null
          items?: Json | null
          notes?: string | null
          packed_by?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_status?: string | null
          paystack_charged?: number | null
          paystack_fee?: number | null
          paystack_reference?: string | null
          recorded_by?: string | null
          ref?: string | null
          shipping_address?: Json | null
          source?: string | null
          status?: string | null
          total_amount?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_rider_id_fkey"
            columns: ["assigned_rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      pay_links: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          email: string
          id: string
          paystack_reference: string | null
          paystack_url: string | null
          status: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          email: string
          id?: string
          paystack_reference?: string | null
          paystack_url?: string | null
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          email?: string
          id?: string
          paystack_reference?: string | null
          paystack_url?: string | null
          status?: string
        }
        Relationships: []
      }
      payment_attempts: {
        Row: {
          amount_ghs: number | null
          authorization_url: string | null
          conversation_id: string
          created_at: string | null
          id: string
          order_id: string | null
          paid_at: string | null
          paystack_reference: string | null
          status: string
        }
        Insert: {
          amount_ghs?: number | null
          authorization_url?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          paid_at?: string | null
          paystack_reference?: string | null
          status?: string
        }
        Update: {
          amount_ghs?: number | null
          authorization_url?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          order_id?: string | null
          paid_at?: string | null
          paystack_reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_attempts_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_attempts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_reservations: {
        Row: {
          expires_at: string
          id: string
          pos_session_id: string
          product_id: string
          quantity: number
          variant_id: string | null
        }
        Insert: {
          expires_at: string
          id?: string
          pos_session_id: string
          product_id: string
          quantity: number
          variant_id?: string | null
        }
        Update: {
          expires_at?: string
          id?: string
          pos_session_id?: string
          product_id?: string
          quantity?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pos_reservations_pos_session_id_fkey"
            columns: ["pos_session_id"]
            isOneToOne: false
            referencedRelation: "pos_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_sessions: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string
          customer_address: string | null
          customer_country: string | null
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          customer_region: string | null
          delivery_fee: number
          delivery_method: string
          delivery_zone: string | null
          discount_amount: number
          discount_code: string | null
          discount_tag: string | null
          expires_at: string | null
          id: string
          items: Json
          notes: string | null
          order_id: string | null
          paid_at: string | null
          payment_method: string
          paystack_reference: string | null
          ref: string | null
          status: string
          total_amount: number
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by: string
          customer_address?: string | null
          customer_country?: string | null
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_region?: string | null
          delivery_fee?: number
          delivery_method?: string
          delivery_zone?: string | null
          discount_amount?: number
          discount_code?: string | null
          discount_tag?: string | null
          expires_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string
          paystack_reference?: string | null
          ref?: string | null
          status?: string
          total_amount: number
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string
          customer_address?: string | null
          customer_country?: string | null
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_region?: string | null
          delivery_fee?: number
          delivery_method?: string
          delivery_zone?: string | null
          discount_amount?: number
          discount_code?: string | null
          discount_tag?: string | null
          expires_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string
          paystack_reference?: string | null
          ref?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "pos_sessions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_sessions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_id: string
          product_id: string
        }
        Insert: {
          category_id: string
          product_id: string
        }
        Update: {
          category_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_categories_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          author_initials: string | null
          author_name: string | null
          avatar_color: string | null
          comment: string | null
          created_at: string
          id: string
          is_verified: boolean
          location: string | null
          product_id: string
          rating: number
        }
        Insert: {
          author_initials?: string | null
          author_name?: string | null
          avatar_color?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          location?: string | null
          product_id: string
          rating: number
        }
        Update: {
          author_initials?: string | null
          author_name?: string | null
          avatar_color?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          location?: string | null
          product_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          brand: string | null
          color: string | null
          created_at: string | null
          id: string
          in_stock: boolean | null
          inventory_count: number | null
          option1_label: string | null
          option1_name: string | null
          option1_value: string | null
          option2_label: string | null
          option2_name: string | null
          option2_value: string | null
          price_override: number | null
          product_id: string
          size: string | null
          sku: string | null
          visible: boolean | null
        }
        Insert: {
          brand?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          in_stock?: boolean | null
          inventory_count?: number | null
          option1_label?: string | null
          option1_name?: string | null
          option1_value?: string | null
          option2_label?: string | null
          option2_name?: string | null
          option2_value?: string | null
          price_override?: number | null
          product_id: string
          size?: string | null
          sku?: string | null
          visible?: boolean | null
        }
        Update: {
          brand?: string | null
          color?: string | null
          created_at?: string | null
          id?: string
          in_stock?: boolean | null
          inventory_count?: number | null
          option1_label?: string | null
          option1_name?: string | null
          option1_value?: string | null
          option2_label?: string | null
          option2_name?: string | null
          option2_value?: string | null
          price_override?: number | null
          product_id?: string
          size?: string | null
          sku?: string | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available_brands: string[] | null
          available_colors: string[] | null
          available_sizes: string[] | null
          available_stitching: string[] | null
          badge: string | null
          brand: string | null
          brand_variants: Json | null
          bundle_label: string | null
          care_instructions: Json | null
          category_id: string | null
          category_ids: string[]
          category_type: string | null
          color_variants: Json | null
          compare_at_price_ghs: number | null
          created_at: string | null
          description: string | null
          discount_mode: string | null
          discount_value: number | null
          features_list: Json | null
          id: string
          image_urls: string[] | null
          inventory_count: number | null
          is_active: boolean | null
          is_featured: boolean | null
          is_published: boolean | null
          is_sale: boolean | null
          is_wholesale_only: boolean
          media: Json | null
          name: string
          preorder_enabled: boolean
          preorder_estimated_date: string | null
          price_ghs: number
          rating_average: number
          review_count: number
          ribbon: string | null
          sale_subtext: string | null
          size_variants: Json | null
          sku: string | null
          slug: string
          sort_order: number | null
          track_inventory: boolean
          track_variant_inventory: boolean
          wholesale_category_id: string | null
          wholesale_override: boolean
          wholesale_price_tier_1: number | null
          wholesale_price_tier_2: number | null
          wholesale_price_tier_3: number | null
          wix_handle_id: string | null
        }
        Insert: {
          available_brands?: string[] | null
          available_colors?: string[] | null
          available_sizes?: string[] | null
          available_stitching?: string[] | null
          badge?: string | null
          brand?: string | null
          brand_variants?: Json | null
          bundle_label?: string | null
          care_instructions?: Json | null
          category_id?: string | null
          category_ids?: string[]
          category_type?: string | null
          color_variants?: Json | null
          compare_at_price_ghs?: number | null
          created_at?: string | null
          description?: string | null
          discount_mode?: string | null
          discount_value?: number | null
          features_list?: Json | null
          id?: string
          image_urls?: string[] | null
          inventory_count?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_published?: boolean | null
          is_sale?: boolean | null
          is_wholesale_only?: boolean
          media?: Json | null
          name: string
          preorder_enabled?: boolean
          preorder_estimated_date?: string | null
          price_ghs: number
          rating_average?: number
          review_count?: number
          ribbon?: string | null
          sale_subtext?: string | null
          size_variants?: Json | null
          sku?: string | null
          slug: string
          sort_order?: number | null
          track_inventory?: boolean
          track_variant_inventory?: boolean
          wholesale_category_id?: string | null
          wholesale_override?: boolean
          wholesale_price_tier_1?: number | null
          wholesale_price_tier_2?: number | null
          wholesale_price_tier_3?: number | null
          wix_handle_id?: string | null
        }
        Update: {
          available_brands?: string[] | null
          available_colors?: string[] | null
          available_sizes?: string[] | null
          available_stitching?: string[] | null
          badge?: string | null
          brand?: string | null
          brand_variants?: Json | null
          bundle_label?: string | null
          care_instructions?: Json | null
          category_id?: string | null
          category_ids?: string[]
          category_type?: string | null
          color_variants?: Json | null
          compare_at_price_ghs?: number | null
          created_at?: string | null
          description?: string | null
          discount_mode?: string | null
          discount_value?: number | null
          features_list?: Json | null
          id?: string
          image_urls?: string[] | null
          inventory_count?: number | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_published?: boolean | null
          is_sale?: boolean | null
          is_wholesale_only?: boolean
          media?: Json | null
          name?: string
          preorder_enabled?: boolean
          preorder_estimated_date?: string | null
          price_ghs?: number
          rating_average?: number
          review_count?: number
          ribbon?: string | null
          sale_subtext?: string | null
          size_variants?: Json | null
          sku?: string | null
          slug?: string
          sort_order?: number | null
          track_inventory?: boolean
          track_variant_inventory?: boolean
          wholesale_category_id?: string | null
          wholesale_override?: boolean
          wholesale_price_tier_1?: number | null
          wholesale_price_tier_2?: number | null
          wholesale_price_tier_3?: number | null
          wix_handle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_wholesale_category_id_fkey"
            columns: ["wholesale_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          acquisition_source: string | null
          address_region: string | null
          address_street: string | null
          country: string | null
          created_at: string | null
          default_address: Json | null
          email: string
          email_subscribed: boolean | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          notif_email: boolean | null
          notif_sms: boolean | null
          notif_whatsapp: boolean | null
          phone: string | null
          role: string | null
          sms_subscribed: boolean | null
        }
        Insert: {
          acquisition_source?: string | null
          address_region?: string | null
          address_street?: string | null
          country?: string | null
          created_at?: string | null
          default_address?: Json | null
          email: string
          email_subscribed?: boolean | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          notif_email?: boolean | null
          notif_sms?: boolean | null
          notif_whatsapp?: boolean | null
          phone?: string | null
          role?: string | null
          sms_subscribed?: boolean | null
        }
        Update: {
          acquisition_source?: string | null
          address_region?: string | null
          address_street?: string | null
          country?: string | null
          created_at?: string | null
          default_address?: Json | null
          email?: string
          email_subscribed?: boolean | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          notif_email?: boolean | null
          notif_sms?: boolean | null
          notif_whatsapp?: boolean | null
          phone?: string | null
          role?: string | null
          sms_subscribed?: boolean | null
        }
        Relationships: []
      }
      push_notification_settings: {
        Row: {
          body: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Update: {
          body?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      riders: {
        Row: {
          bike_reg: string | null
          created_at: string
          full_name: string
          id: string
          image_url: string | null
          is_active: boolean
          phone_number: string
        }
        Insert: {
          bike_reg?: string | null
          created_at?: string
          full_name: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          phone_number: string
        }
        Update: {
          bike_reg?: string | null
          created_at?: string
          full_name?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          phone_number?: string
        }
        Relationships: []
      }
      site_assets: {
        Row: {
          alt_text: string | null
          image_url: string | null
          is_active: boolean
          label: string | null
          link_url: string | null
          section_key: string
          updated_at: string | null
        }
        Insert: {
          alt_text?: string | null
          image_url?: string | null
          is_active?: boolean
          label?: string | null
          link_url?: string | null
          section_key: string
          updated_at?: string | null
        }
        Update: {
          alt_text?: string | null
          image_url?: string | null
          is_active?: boolean
          label?: string | null
          link_url?: string | null
          section_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_copy: {
        Row: {
          copy_key: string
          hint: string | null
          label: string
          page_group: string
          updated_at: string
          value: string
        }
        Insert: {
          copy_key: string
          hint?: string | null
          label: string
          page_group?: string
          updated_at?: string
          value?: string
        }
        Update: {
          copy_key?: string
          hint?: string | null
          label?: string
          page_group?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      site_metadata: {
        Row: {
          created_at: string | null
          description: string | null
          keywords: string | null
          og_image_url: string | null
          page_path: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          keywords?: string | null
          og_image_url?: string | null
          page_path: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          keywords?: string | null
          og_image_url?: string | null
          page_path?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          about_cta_body: string
          about_cta_btn_label: string
          about_cta_btn_url: string
          about_cta_eyebrow: string
          about_cta_headline: string
          about_eyebrow: string
          about_headline_line1: string
          about_headline_line2: string
          about_manifesto_p1: string
          about_manifesto_p2: string
          about_manifesto_p3: string
          about_quote_author: string
          about_quote_text: string
          about_stat_1_label: string
          about_stat_1_value: string
          about_stat_2_label: string
          about_stat_2_value: string
          about_stat_3_label: string
          about_stat_3_value: string
          about_story_heading: string
          about_story_p1: string
          about_story_p2: string
          about_team: Json
          about_timeline: Json
          about_values: Json
          gc_delivery_note: string | null
          gc_enabled: boolean
          gc_max_amount: number
          gc_min_amount: number
          gc_never_expires: boolean
          gc_preset_amounts: Json
          gc_validity_days: number
          homepage_new_arrivals_category_id: string | null
          homepage_new_arrivals_limit: number
          homepage_new_arrivals_title: string
          hours_note: string
          hours_saturday: string
          hours_sunday: string
          hours_weekday: string
          id: string
          instagram_access_token: string | null
          nav_show_about: boolean
          nav_show_contact: boolean
          nav_show_dresses: boolean | null
          nav_show_gallery: boolean | null
          nav_show_gift_card: boolean
          nav_show_home: boolean
          nav_show_new_arrivals: boolean
          nav_show_sale: boolean | null
          nav_show_shop: boolean
          optin_section_enabled: boolean
          optin_subtitle: string
          optin_title: string
          pdp_show_care_instructions: boolean
          pdp_show_delivery_returns: boolean
          pdp_show_product_details: boolean
          pdp_show_reviews: boolean
          pdp_show_trust_strip: boolean
          pickup_address: string | null
          pickup_contact_phone: string | null
          pickup_enabled: boolean
          pickup_estimated_wait: string
          pickup_instructions: string
          shop_pagination_type: string
          social_facebook: string | null
          social_instagram: string | null
          social_pinterest: string | null
          social_snapchat: string | null
          social_threads: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_youtube: string | null
          store_address: string | null
          store_description: string | null
          store_email: string | null
          store_name: string
          store_phone: string | null
          store_tagline: string | null
          trust_bar_enabled: boolean
          trust_bar_items: Json
          updated_at: string
          welcome_coupon_code: string
          welcome_coupon_enabled: boolean
          welcome_coupon_percentage: number
        }
        Insert: {
          about_cta_body?: string
          about_cta_btn_label?: string
          about_cta_btn_url?: string
          about_cta_eyebrow?: string
          about_cta_headline?: string
          about_eyebrow?: string
          about_headline_line1?: string
          about_headline_line2?: string
          about_manifesto_p1?: string
          about_manifesto_p2?: string
          about_manifesto_p3?: string
          about_quote_author?: string
          about_quote_text?: string
          about_stat_1_label?: string
          about_stat_1_value?: string
          about_stat_2_label?: string
          about_stat_2_value?: string
          about_stat_3_label?: string
          about_stat_3_value?: string
          about_story_heading?: string
          about_story_p1?: string
          about_story_p2?: string
          about_team?: Json
          about_timeline?: Json
          about_values?: Json
          gc_delivery_note?: string | null
          gc_enabled?: boolean
          gc_max_amount?: number
          gc_min_amount?: number
          gc_never_expires?: boolean
          gc_preset_amounts?: Json
          gc_validity_days?: number
          homepage_new_arrivals_category_id?: string | null
          homepage_new_arrivals_limit?: number
          homepage_new_arrivals_title?: string
          hours_note?: string
          hours_saturday?: string
          hours_sunday?: string
          hours_weekday?: string
          id?: string
          instagram_access_token?: string | null
          nav_show_about?: boolean
          nav_show_contact?: boolean
          nav_show_dresses?: boolean | null
          nav_show_gallery?: boolean | null
          nav_show_gift_card?: boolean
          nav_show_home?: boolean
          nav_show_new_arrivals?: boolean
          nav_show_sale?: boolean | null
          nav_show_shop?: boolean
          optin_section_enabled?: boolean
          optin_subtitle?: string
          optin_title?: string
          pdp_show_care_instructions?: boolean
          pdp_show_delivery_returns?: boolean
          pdp_show_product_details?: boolean
          pdp_show_reviews?: boolean
          pdp_show_trust_strip?: boolean
          pickup_address?: string | null
          pickup_contact_phone?: string | null
          pickup_enabled?: boolean
          pickup_estimated_wait?: string
          pickup_instructions?: string
          shop_pagination_type?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_pinterest?: string | null
          social_snapchat?: string | null
          social_threads?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          store_address?: string | null
          store_description?: string | null
          store_email?: string | null
          store_name?: string
          store_phone?: string | null
          store_tagline?: string | null
          trust_bar_enabled?: boolean
          trust_bar_items?: Json
          updated_at?: string
          welcome_coupon_code?: string
          welcome_coupon_enabled?: boolean
          welcome_coupon_percentage?: number
        }
        Update: {
          about_cta_body?: string
          about_cta_btn_label?: string
          about_cta_btn_url?: string
          about_cta_eyebrow?: string
          about_cta_headline?: string
          about_eyebrow?: string
          about_headline_line1?: string
          about_headline_line2?: string
          about_manifesto_p1?: string
          about_manifesto_p2?: string
          about_manifesto_p3?: string
          about_quote_author?: string
          about_quote_text?: string
          about_stat_1_label?: string
          about_stat_1_value?: string
          about_stat_2_label?: string
          about_stat_2_value?: string
          about_stat_3_label?: string
          about_stat_3_value?: string
          about_story_heading?: string
          about_story_p1?: string
          about_story_p2?: string
          about_team?: Json
          about_timeline?: Json
          about_values?: Json
          gc_delivery_note?: string | null
          gc_enabled?: boolean
          gc_max_amount?: number
          gc_min_amount?: number
          gc_never_expires?: boolean
          gc_preset_amounts?: Json
          gc_validity_days?: number
          homepage_new_arrivals_category_id?: string | null
          homepage_new_arrivals_limit?: number
          homepage_new_arrivals_title?: string
          hours_note?: string
          hours_saturday?: string
          hours_sunday?: string
          hours_weekday?: string
          id?: string
          instagram_access_token?: string | null
          nav_show_about?: boolean
          nav_show_contact?: boolean
          nav_show_dresses?: boolean | null
          nav_show_gallery?: boolean | null
          nav_show_gift_card?: boolean
          nav_show_home?: boolean
          nav_show_new_arrivals?: boolean
          nav_show_sale?: boolean | null
          nav_show_shop?: boolean
          optin_section_enabled?: boolean
          optin_subtitle?: string
          optin_title?: string
          pdp_show_care_instructions?: boolean
          pdp_show_delivery_returns?: boolean
          pdp_show_product_details?: boolean
          pdp_show_reviews?: boolean
          pdp_show_trust_strip?: boolean
          pickup_address?: string | null
          pickup_contact_phone?: string | null
          pickup_enabled?: boolean
          pickup_estimated_wait?: string
          pickup_instructions?: string
          shop_pagination_type?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_pinterest?: string | null
          social_snapchat?: string | null
          social_threads?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_youtube?: string | null
          store_address?: string | null
          store_description?: string | null
          store_email?: string | null
          store_name?: string
          store_phone?: string | null
          store_tagline?: string | null
          trust_bar_enabled?: boolean
          trust_bar_items?: Json
          updated_at?: string
          welcome_coupon_code?: string
          welcome_coupon_enabled?: boolean
          welcome_coupon_percentage?: number
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_homepage_new_arrivals_category_id_fkey"
            columns: ["homepage_new_arrivals_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          actor: string | null
          applied_delta: number
          created_at: string
          delta: number
          id: string
          idempotency_key: string | null
          note: string | null
          order_id: string | null
          pos_session_id: string | null
          product_id: string
          reason: string
          variant_id: string | null
        }
        Insert: {
          actor?: string | null
          applied_delta?: number
          created_at?: string
          delta: number
          id?: string
          idempotency_key?: string | null
          note?: string | null
          order_id?: string | null
          pos_session_id?: string | null
          product_id: string
          reason: string
          variant_id?: string | null
        }
        Update: {
          actor?: string | null
          applied_delta?: number
          created_at?: string
          delta?: number
          id?: string
          idempotency_key?: string | null
          note?: string | null
          order_id?: string | null
          pos_session_id?: string | null
          product_id?: string
          reason?: string
          variant_id?: string | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          checkout_undo_removed_enabled: boolean
          delivery_fee_accra: number
          delivery_fee_outside: number
          delivery_fees_enabled: boolean
          enable_craft: boolean | null
          enable_custom_requests: boolean
          enable_gallery: boolean | null
          enable_gift_cards: boolean | null
          enable_store_pickup: boolean | null
          enable_whitelabel: boolean | null
          global_brands: string[] | null
          global_colors: string[] | null
          global_sizes: string[] | null
          home_grid_cols: number
          home_product_limit: number
          homepage_route: string
          id: string
          maintenance_mode: boolean | null
          platform_fee_label: string | null
          platform_fee_percentage: number | null
          pos_hold_minutes: number
          shop_grid_cols: number
          shop_image_stretch: boolean
          shop_mobile_cols: number
          shop_product_limit: number
          shop_show_title: boolean
          show_fee_at_checkout: boolean | null
          wholesale_enabled: boolean
          wholesale_tier_1_max: number
          wholesale_tier_1_min: number
          wholesale_tier_2_max: number
          wholesale_tier_2_min: number
          wholesale_tier_3_max: number
          wholesale_tier_3_min: number
        }
        Insert: {
          checkout_undo_removed_enabled?: boolean
          delivery_fee_accra?: number
          delivery_fee_outside?: number
          delivery_fees_enabled?: boolean
          enable_craft?: boolean | null
          enable_custom_requests?: boolean
          enable_gallery?: boolean | null
          enable_gift_cards?: boolean | null
          enable_store_pickup?: boolean | null
          enable_whitelabel?: boolean | null
          global_brands?: string[] | null
          global_colors?: string[] | null
          global_sizes?: string[] | null
          home_grid_cols?: number
          home_product_limit?: number
          homepage_route?: string
          id?: string
          maintenance_mode?: boolean | null
          platform_fee_label?: string | null
          platform_fee_percentage?: number | null
          pos_hold_minutes?: number
          shop_grid_cols?: number
          shop_image_stretch?: boolean
          shop_mobile_cols?: number
          shop_product_limit?: number
          shop_show_title?: boolean
          show_fee_at_checkout?: boolean | null
          wholesale_enabled?: boolean
          wholesale_tier_1_max?: number
          wholesale_tier_1_min?: number
          wholesale_tier_2_max?: number
          wholesale_tier_2_min?: number
          wholesale_tier_3_max?: number
          wholesale_tier_3_min?: number
        }
        Update: {
          checkout_undo_removed_enabled?: boolean
          delivery_fee_accra?: number
          delivery_fee_outside?: number
          delivery_fees_enabled?: boolean
          enable_craft?: boolean | null
          enable_custom_requests?: boolean
          enable_gallery?: boolean | null
          enable_gift_cards?: boolean | null
          enable_store_pickup?: boolean | null
          enable_whitelabel?: boolean | null
          global_brands?: string[] | null
          global_colors?: string[] | null
          global_sizes?: string[] | null
          home_grid_cols?: number
          home_product_limit?: number
          homepage_route?: string
          id?: string
          maintenance_mode?: boolean | null
          platform_fee_label?: string | null
          platform_fee_percentage?: number | null
          pos_hold_minutes?: number
          shop_grid_cols?: number
          shop_image_stretch?: boolean
          shop_mobile_cols?: number
          shop_product_limit?: number
          shop_show_title?: boolean
          show_fee_at_checkout?: boolean | null
          wholesale_enabled?: boolean
          wholesale_tier_1_max?: number
          wholesale_tier_1_min?: number
          wholesale_tier_2_max?: number
          wholesale_tier_2_min?: number
          wholesale_tier_3_max?: number
          wholesale_tier_3_min?: number
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string | null
          full_name: string
          id: string
          invited_by: string | null
          phone: string | null
          role: string
          status: string
          token: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at?: string | null
          full_name: string
          id?: string
          invited_by?: string | null
          phone?: string | null
          role: string
          status?: string
          token: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string | null
          full_name?: string
          id?: string
          invited_by?: string | null
          phone?: string | null
          role?: string
          status?: string
          token?: string
        }
        Relationships: []
      }
      whatsapp_conversations: {
        Row: {
          assigned_staff_id: string | null
          created_at: string | null
          current_order_draft: Json | null
          handed_off_at: string | null
          id: string
          last_message_at: string | null
          state: Json
          wa_contact_name: string | null
          wa_phone_number: string
        }
        Insert: {
          assigned_staff_id?: string | null
          created_at?: string | null
          current_order_draft?: Json | null
          handed_off_at?: string | null
          id?: string
          last_message_at?: string | null
          state?: Json
          wa_contact_name?: string | null
          wa_phone_number: string
        }
        Update: {
          assigned_staff_id?: string | null
          created_at?: string | null
          current_order_draft?: Json | null
          handed_off_at?: string | null
          id?: string
          last_message_at?: string | null
          state?: Json
          wa_contact_name?: string | null
          wa_phone_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      contact_directory: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          is_manual: boolean | null
          name: string | null
          phone: string | null
          source: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      find_order_by_ref: {
        Args: { p_email?: string; p_phone?: string; p_ref: string }
        Returns: {
          created_at: string
          customer_name: string
          delivery_method: string
          id: string
          items: Json
          shipping_address: Json
          status: string
          total_amount: number
        }[]
      }
      fn_adjust_stock: {
        Args: { p_delta?: number; p_product_id: string; p_variant_id?: string }
        Returns: undefined
      }
      fn_apply_stock_movement: {
        Args: {
          p_actor?: string
          p_delta?: number
          p_idempotency_key?: string
          p_note?: string
          p_order_id?: string
          p_pos_session_id?: string
          p_product_id: string
          p_reason?: string
          p_variant_id?: string
        }
        Returns: boolean
      }
      fn_available_coupon_uses: {
        Args: { p_coupon_id: string }
        Returns: number
      }
      fn_available_gift_card_value: {
        Args: { p_card_id: string }
        Returns: number
      }
      fn_available_stock: {
        Args: { p_product_id: string; p_variant_id?: string }
        Returns: number
      }
      fn_available_stock_batch: {
        Args: { p_items: Json }
        Returns: {
          available: number
          product_id: string
          variant_id: string
        }[]
      }
      fn_available_stock_bulk: {
        Args: { p_product_ids: string[] }
        Returns: {
          available: number
          product_id: string
        }[]
      }
      fn_claim_coupon_use: { Args: { p_coupon_id: string }; Returns: boolean }
      fn_combined_available_stock: {
        Args: { p_product_id: string; p_variant_id?: string }
        Returns: number
      }
      fn_decrement_stock: {
        Args: {
          p_product_id: string
          p_quantity?: number
          p_variant_id?: string
        }
        Returns: undefined
      }
      fn_hold_discount: {
        Args: {
          p_amount: number
          p_code_id: string
          p_kind: string
          p_order_id?: string
          p_pos_session_id?: string
          p_ttl_mins?: number
        }
        Returns: undefined
      }
      fn_increment_coupon_usage: {
        Args: { p_coupon_id: string }
        Returns: number
      }
      fn_record_sale: {
        Args: { p_items: Json; p_order_id: string; p_reason?: string }
        Returns: number
      }
      fn_redeem_gift_card: {
        Args: { p_amount: number; p_card_id: string }
        Returns: number
      }
      fn_release_discount_holds: {
        Args: { p_order_id?: string; p_pos_session_id?: string }
        Returns: undefined
      }
      fn_reserve_online_stock: {
        Args: { p_items: Json; p_order_id: string; p_ttl_mins?: number }
        Returns: undefined
      }
      fn_reserve_pos_stock:
        | { Args: { p_items: Json; p_session_id: string }; Returns: undefined }
        | {
            Args: { p_items: Json; p_session_id: string; p_ttl_mins?: number }
            Returns: undefined
          }
      fn_sync_order_stock_position: {
        Args: {
          p_items: Json
          p_note?: string
          p_order_id: string
          p_should_hold: boolean
        }
        Returns: number
      }
      fn_sync_product_stock_from_variants: {
        Args: { p_product_id: string }
        Returns: number
      }
      get_order_stats: { Args: never; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      refresh_category_product_counts: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
