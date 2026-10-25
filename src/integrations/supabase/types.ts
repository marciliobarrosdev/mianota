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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      agendamento: {
        Row: {
          card_id: string | null
          company_id: string
          created_at: string
          fim: string
          google_event_id: string | null
          id: string
          inicio: string
          status: string
          titulo: string
        }
        Insert: {
          card_id?: string | null
          company_id: string
          created_at?: string
          fim: string
          google_event_id?: string | null
          id?: string
          inicio: string
          status?: string
          titulo: string
        }
        Update: {
          card_id?: string | null
          company_id?: string
          created_at?: string
          fim?: string
          google_event_id?: string | null
          id?: string
          inicio?: string
          status?: string
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "agendamento_card_company_fkey"
            columns: ["company_id", "card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "agendamento_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_config: {
        Row: {
          agendamento_ativo: boolean
          ai_model: string
          ai_provider: string
          antecedencia_min: string
          apresentacao: string
          assinar_mensagens: boolean | null
          chamar_por_nome: boolean | null
          como_vender: string
          company_id: string
          cupom: string
          descricao_negocio: string
          diferenciais: string
          duracao_padrao: string
          emoji_intensidade: string | null
          estilo_comunicacao: string
          evitar_palavras: string | null
          faq: string
          foco_atendimento: string | null
          formalidade: number
          formas_pagamento: string
          horarios_atendimento: Json
          horarios_disponiveis: string
          idioma: string | null
          mensagem_fora_horario: string
          nao_pode_fazer: string
          nome_agente: string
          nome_empresa: string
          objecoes: string
          ofertas: string
          palavra_despausar: string
          palavra_pausar: string
          papel_objetivo: string
          pedir_avaliacao: boolean
          perguntar_uma_por_vez: boolean | null
          personalidade: string | null
          pode_brincar: boolean | null
          pode_fazer: string
          politicas: string
          posvenda_msg: string
          proatividade: number | null
          produtos_servicos: string
          publico_alvo: string
          reativar_cliente: boolean
          regiao_horario: string
          responder_em_partes: boolean
          segmento: string
          segundos_buffer: number
          servicos_agendaveis: string
          sobre_empresa: string
          tamanho_resposta: string
          telefone_transferencia: string
          ticket_medio: string
          tom: number
          updated_at: string
          usar_emojis: boolean
          usar_girias: boolean | null
          user_id: string
          velocidade_resposta: string | null
        }
        Insert: {
          agendamento_ativo?: boolean
          ai_model?: string
          ai_provider?: string
          antecedencia_min?: string
          apresentacao?: string
          assinar_mensagens?: boolean | null
          chamar_por_nome?: boolean | null
          como_vender?: string
          company_id: string
          cupom?: string
          descricao_negocio?: string
          diferenciais?: string
          duracao_padrao?: string
          emoji_intensidade?: string | null
          estilo_comunicacao?: string
          evitar_palavras?: string | null
          faq?: string
          foco_atendimento?: string | null
          formalidade?: number
          formas_pagamento?: string
          horarios_atendimento?: Json
          horarios_disponiveis?: string
          idioma?: string | null
          mensagem_fora_horario?: string
          nao_pode_fazer?: string
          nome_agente?: string
          nome_empresa?: string
          objecoes?: string
          ofertas?: string
          palavra_despausar?: string
          palavra_pausar?: string
          papel_objetivo?: string
          pedir_avaliacao?: boolean
          perguntar_uma_por_vez?: boolean | null
          personalidade?: string | null
          pode_brincar?: boolean | null
          pode_fazer?: string
          politicas?: string
          posvenda_msg?: string
          proatividade?: number | null
          produtos_servicos?: string
          publico_alvo?: string
          reativar_cliente?: boolean
          regiao_horario?: string
          responder_em_partes?: boolean
          segmento?: string
          segundos_buffer?: number
          servicos_agendaveis?: string
          sobre_empresa?: string
          tamanho_resposta?: string
          telefone_transferencia?: string
          ticket_medio?: string
          tom?: number
          updated_at?: string
          usar_emojis?: boolean
          usar_girias?: boolean | null
          user_id: string
          velocidade_resposta?: string | null
        }
        Update: {
          agendamento_ativo?: boolean
          ai_model?: string
          ai_provider?: string
          antecedencia_min?: string
          apresentacao?: string
          assinar_mensagens?: boolean | null
          chamar_por_nome?: boolean | null
          como_vender?: string
          company_id?: string
          cupom?: string
          descricao_negocio?: string
          diferenciais?: string
          duracao_padrao?: string
          emoji_intensidade?: string | null
          estilo_comunicacao?: string
          evitar_palavras?: string | null
          faq?: string
          foco_atendimento?: string | null
          formalidade?: number
          formas_pagamento?: string
          horarios_atendimento?: Json
          horarios_disponiveis?: string
          idioma?: string | null
          mensagem_fora_horario?: string
          nao_pode_fazer?: string
          nome_agente?: string
          nome_empresa?: string
          objecoes?: string
          ofertas?: string
          palavra_despausar?: string
          palavra_pausar?: string
          papel_objetivo?: string
          pedir_avaliacao?: boolean
          perguntar_uma_por_vez?: boolean | null
          personalidade?: string | null
          pode_brincar?: boolean | null
          pode_fazer?: string
          politicas?: string
          posvenda_msg?: string
          proatividade?: number | null
          produtos_servicos?: string
          publico_alvo?: string
          reativar_cliente?: boolean
          regiao_horario?: string
          responder_em_partes?: boolean
          segmento?: string
          segundos_buffer?: number
          servicos_agendaveis?: string
          sobre_empresa?: string
          tamanho_resposta?: string
          telefone_transferencia?: string
          ticket_medio?: string
          tom?: number
          updated_at?: string
          usar_emojis?: boolean
          usar_girias?: boolean | null
          user_id?: string
          velocidade_resposta?: string | null
        }
        Relationships: []
      }
      ai_provider_config: {
        Row: {
          id: boolean
          last_error: string | null
          mode: string
          model: string | null
          optimized: boolean
          test_ok: boolean | null
          tested_at: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          last_error?: string | null
          mode?: string
          model?: string | null
          optimized?: boolean
          test_ok?: boolean | null
          tested_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          last_error?: string | null
          mode?: string
          model?: string | null
          optimized?: boolean
          test_ok?: boolean | null
          tested_at?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      api_token: {
        Row: {
          company_id: string
          created_at: string
          criado_por: string | null
          id: string
          label: string
          revogado: boolean
          token: string
          ultimo_uso_em: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          criado_por?: string | null
          id?: string
          label: string
          revogado?: boolean
          token?: string
          ultimo_uso_em?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          criado_por?: string | null
          id?: string
          label?: string
          revogado?: boolean
          token?: string
          ultimo_uso_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_token_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      app_config: {
        Row: {
          id: boolean
          super_admin_emails: string[]
          updated_at: string
        }
        Insert: {
          id?: boolean
          super_admin_emails?: string[]
          updated_at?: string
        }
        Update: {
          id?: boolean
          super_admin_emails?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          acao: string
          actor_email: string | null
          company_id: string
          created_at: string
          detalhes: Json | null
          id: string
          ip: string | null
          recurso: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          acao: string
          actor_email?: string | null
          company_id: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip?: string | null
          recurso?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          acao?: string
          actor_email?: string | null
          company_id?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip?: string | null
          recurso?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_event_log: {
        Row: {
          buyer_email: string | null
          created_at: string
          error: string | null
          event_type: string | null
          external_id: string | null
          id: string
          matched_company_id: string | null
          payload: Json
          processed: boolean
          provider: string
        }
        Insert: {
          buyer_email?: string | null
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          matched_company_id?: string | null
          payload?: Json
          processed?: boolean
          provider: string
        }
        Update: {
          buyer_email?: string | null
          created_at?: string
          error?: string | null
          event_type?: string | null
          external_id?: string | null
          id?: string
          matched_company_id?: string | null
          payload?: Json
          processed?: boolean
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_event_log_matched_company_id_fkey"
            columns: ["matched_company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign: {
        Row: {
          agendado_para: string | null
          company_id: string
          concluido_em: string | null
          created_at: string
          created_by: string | null
          filtro_tags: string[] | null
          id: string
          iniciado_em: string | null
          intervalo_max_seg: number
          intervalo_min_seg: number
          media_url: string | null
          mensagem: string
          nome: string
          pausa_apos_envios: number
          pausa_duracao_min: number
          proximo_envio_em: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          total_destinatarios: number
          total_enviados: number
          total_falhas: number
          updated_at: string
        }
        Insert: {
          agendado_para?: string | null
          company_id: string
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          filtro_tags?: string[] | null
          id?: string
          iniciado_em?: string | null
          intervalo_max_seg?: number
          intervalo_min_seg?: number
          media_url?: string | null
          mensagem: string
          nome: string
          pausa_apos_envios?: number
          pausa_duracao_min?: number
          proximo_envio_em?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          total_destinatarios?: number
          total_enviados?: number
          total_falhas?: number
          updated_at?: string
        }
        Update: {
          agendado_para?: string | null
          company_id?: string
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          filtro_tags?: string[] | null
          id?: string
          iniciado_em?: string | null
          intervalo_max_seg?: number
          intervalo_min_seg?: number
          media_url?: string | null
          mensagem?: string
          nome?: string
          pausa_apos_envios?: number
          pausa_duracao_min?: number
          proximo_envio_em?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          total_destinatarios?: number
          total_enviados?: number
          total_falhas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_target: {
        Row: {
          campaign_id: string
          company_id: string
          contato_nome: string | null
          contato_numero: string
          created_at: string
          enviado_em: string | null
          erro: string | null
          id: string
          status: Database["public"]["Enums"]["campaign_target_status"]
        }
        Insert: {
          campaign_id: string
          company_id: string
          contato_nome?: string | null
          contato_numero: string
          created_at?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          status?: Database["public"]["Enums"]["campaign_target_status"]
        }
        Update: {
          campaign_id?: string
          company_id?: string
          contato_nome?: string | null
          contato_numero?: string
          created_at?: string
          enviado_em?: string | null
          erro?: string | null
          id?: string
          status?: Database["public"]["Enums"]["campaign_target_status"]
        }
        Relationships: [
          {
            foreignKeyName: "campaign_target_campaign_company_fkey"
            columns: ["company_id", "campaign_id"]
            isOneToOne: false
            referencedRelation: "campaign"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "campaign_target_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      clone_brand_config: {
        Row: {
          assistant_name: string
          avatar_url: string | null
          description: string
          icon_url: string | null
          id: boolean
          logo_url: string | null
          primary_color: string
          product_name: string
          short_name: string
          tagline: string
          updated_at: string
        }
        Insert: {
          assistant_name?: string
          avatar_url?: string | null
          description?: string
          icon_url?: string | null
          id?: boolean
          logo_url?: string | null
          primary_color?: string
          product_name?: string
          short_name?: string
          tagline?: string
          updated_at?: string
        }
        Update: {
          assistant_name?: string
          avatar_url?: string | null
          description?: string
          icon_url?: string | null
          id?: boolean
          logo_url?: string | null
          primary_color?: string
          product_name?: string
          short_name?: string
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      company: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string | null
          complemento: string | null
          created_at: string
          created_by: string | null
          creditos_origem: string
          creditos_resetam_em: string | null
          creditos_saldo: number
          email_corporativo: string | null
          estado: string | null
          finance_profile: Json
          financeiro_ativo: boolean
          financeiro_dias_vencimento_padrao: number
          id: string
          inscricao_estadual: string | null
          logo_url: string | null
          nome: string
          nome_fantasia: string | null
          numero: string | null
          onboarding_completed: boolean
          onboarding_step: number
          pais: string | null
          porte: string | null
          primary_color: string
          razao_social: string | null
          rua: string | null
          segmento: string | null
          selected_plan_slug: string | null
          site: string | null
          slug: string
          status_cobranca: string
          telefone: string | null
          tipo_pessoa: string
          trial_ate: string
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          creditos_origem?: string
          creditos_resetam_em?: string | null
          creditos_saldo?: number
          email_corporativo?: string | null
          estado?: string | null
          finance_profile?: Json
          financeiro_ativo?: boolean
          financeiro_dias_vencimento_padrao?: number
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          nome: string
          nome_fantasia?: string | null
          numero?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          pais?: string | null
          porte?: string | null
          primary_color?: string
          razao_social?: string | null
          rua?: string | null
          segmento?: string | null
          selected_plan_slug?: string | null
          site?: string | null
          slug: string
          status_cobranca?: string
          telefone?: string | null
          tipo_pessoa?: string
          trial_ate?: string
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          complemento?: string | null
          created_at?: string
          created_by?: string | null
          creditos_origem?: string
          creditos_resetam_em?: string | null
          creditos_saldo?: number
          email_corporativo?: string | null
          estado?: string | null
          finance_profile?: Json
          financeiro_ativo?: boolean
          financeiro_dias_vencimento_padrao?: number
          id?: string
          inscricao_estadual?: string | null
          logo_url?: string | null
          nome?: string
          nome_fantasia?: string | null
          numero?: string | null
          onboarding_completed?: boolean
          onboarding_step?: number
          pais?: string | null
          porte?: string | null
          primary_color?: string
          razao_social?: string | null
          rua?: string | null
          segmento?: string | null
          selected_plan_slug?: string | null
          site?: string | null
          slug?: string
          status_cobranca?: string
          telefone?: string | null
          tipo_pessoa?: string
          trial_ate?: string
          updated_at?: string
        }
        Relationships: []
      }
      company_billing: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj_cpf: string | null
          company_id: string
          complemento: string | null
          created_at: string
          email_cobranca: string | null
          estado: string | null
          id: string
          inscricao_estadual: string | null
          nome_responsavel: string | null
          numero: string | null
          pais: string | null
          razao_social: string | null
          rua: string | null
          telefone: string | null
          tipo_pessoa: string
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          company_id: string
          complemento?: string | null
          created_at?: string
          email_cobranca?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_responsavel?: string | null
          numero?: string | null
          pais?: string | null
          razao_social?: string | null
          rua?: string | null
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj_cpf?: string | null
          company_id?: string
          complemento?: string | null
          created_at?: string
          email_cobranca?: string | null
          estado?: string | null
          id?: string
          inscricao_estadual?: string | null
          nome_responsavel?: string | null
          numero?: string | null
          pais?: string | null
          razao_social?: string | null
          rua?: string | null
          telefone?: string | null
          tipo_pessoa?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_billing_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      company_provision_request: {
        Row: {
          company_id: string
          created_at: string
          idempotency_key: string
          owner_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          idempotency_key: string
          owner_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          idempotency_key?: string
          owner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_provision_request_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      company_user: {
        Row: {
          ativo: boolean
          company_id: string
          convite_token: string | null
          created_at: string
          forcar_troca_senha: boolean
          id: string
          role: Database["public"]["Enums"]["tenant_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          convite_token?: string | null
          created_at?: string
          forcar_troca_senha?: boolean
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          convite_token?: string | null
          created_at?: string
          forcar_troca_senha?: boolean
          id?: string
          role?: Database["public"]["Enums"]["tenant_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_user_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_pause: {
        Row: {
          company_id: string
          numero: string
          pausado: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          numero: string
          pausado?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          numero?: string
          pausado?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_ledger: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          delta: number
          id: string
          motivo: string
          ref: string | null
          saldo_apos: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          delta: number
          id?: string
          motivo: string
          ref?: string | null
          saldo_apos: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          delta?: number
          id?: string
          motivo?: string
          ref?: string | null
          saldo_apos?: number
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_cards: {
        Row: {
          company_id: string
          follow_up: string | null
          id: string
          nome: string | null
          numero: string
          observacao: string | null
          origem: string | null
          owner_id: string | null
          proxima_acao: string | null
          stage_id: string | null
          status: string
          tags: string[]
          ultima_em: string
          ultima_mensagem: string | null
          updated_at: string
          user_id: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          valor: number
        }
        Insert: {
          company_id: string
          follow_up?: string | null
          id?: string
          nome?: string | null
          numero: string
          observacao?: string | null
          origem?: string | null
          owner_id?: string | null
          proxima_acao?: string | null
          stage_id?: string | null
          status?: string
          tags?: string[]
          ultima_em?: string
          ultima_mensagem?: string | null
          updated_at?: string
          user_id: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor?: number
        }
        Update: {
          company_id?: string
          follow_up?: string | null
          id?: string
          nome?: string | null
          numero?: string
          observacao?: string | null
          origem?: string | null
          owner_id?: string | null
          proxima_acao?: string | null
          stage_id?: string | null
          status?: string
          tags?: string[]
          ultima_em?: string
          ultima_mensagem?: string | null
          updated_at?: string
          user_id?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "crm_cards_stage_company_fkey"
            columns: ["company_id", "stage_id"]
            isOneToOne: false
            referencedRelation: "crm_stage"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      crm_stage: {
        Row: {
          company_id: string
          cor: string
          created_at: string
          id: string
          nome: string
          ordem: number
          tipo: Database["public"]["Enums"]["stage_tipo"]
        }
        Insert: {
          company_id: string
          cor?: string
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          tipo?: Database["public"]["Enums"]["stage_tipo"]
        }
        Update: {
          company_id?: string
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          tipo?: Database["public"]["Enums"]["stage_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "crm_stage_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      csat_response: {
        Row: {
          comentario: string | null
          company_id: string
          contato_nome: string | null
          created_at: string
          enviado_em: string
          enviado_por: string | null
          id: string
          numero: string
          respondido_em: string | null
          score: number | null
          token: string
          updated_at: string
        }
        Insert: {
          comentario?: string | null
          company_id: string
          contato_nome?: string | null
          created_at?: string
          enviado_em?: string
          enviado_por?: string | null
          id?: string
          numero: string
          respondido_em?: string | null
          score?: number | null
          token?: string
          updated_at?: string
        }
        Update: {
          comentario?: string | null
          company_id?: string
          contato_nome?: string | null
          created_at?: string
          enviado_em?: string
          enviado_por?: string | null
          id?: string
          numero?: string
          respondido_em?: string | null
          score?: number | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "csat_response_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_bank_connection: {
        Row: {
          company_id: string
          consent_expires_at: string | null
          created_at: string
          id: string
          institution_logo_url: string | null
          institution_name: string | null
          last_error: string | null
          last_sync_at: string | null
          metadata: Json
          provider: string
          provider_item_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          company_id: string
          consent_expires_at?: string | null
          created_at?: string
          id?: string
          institution_logo_url?: string | null
          institution_name?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          metadata?: Json
          provider?: string
          provider_item_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          consent_expires_at?: string | null
          created_at?: string
          id?: string
          institution_logo_url?: string | null
          institution_name?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          metadata?: Json
          provider?: string
          provider_item_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_bank_connection_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_cartao: {
        Row: {
          ativo: boolean
          bandeira: string | null
          company_id: string
          conta_id: string | null
          cor: string
          created_at: string
          fechamento_dia: number | null
          id: string
          limite_cents: number | null
          nome: string
          provider_card_id: string | null
          ultimos_quatro: string | null
          updated_at: string
          vencimento_dia: number | null
        }
        Insert: {
          ativo?: boolean
          bandeira?: string | null
          company_id: string
          conta_id?: string | null
          cor?: string
          created_at?: string
          fechamento_dia?: number | null
          id?: string
          limite_cents?: number | null
          nome: string
          provider_card_id?: string | null
          ultimos_quatro?: string | null
          updated_at?: string
          vencimento_dia?: number | null
        }
        Update: {
          ativo?: boolean
          bandeira?: string | null
          company_id?: string
          conta_id?: string | null
          cor?: string
          created_at?: string
          fechamento_dia?: number | null
          id?: string
          limite_cents?: number | null
          nome?: string
          provider_card_id?: string | null
          ultimos_quatro?: string | null
          updated_at?: string
          vencimento_dia?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_cartao_company_id_conta_id_fkey"
            columns: ["company_id", "conta_id"]
            isOneToOne: false
            referencedRelation: "fin_conta"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_cartao_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_categoria: {
        Row: {
          ativo: boolean
          company_id: string
          cor: string
          created_at: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["fin_tipo"]
        }
        Insert: {
          ativo?: boolean
          company_id: string
          cor?: string
          created_at?: string
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["fin_tipo"]
        }
        Update: {
          ativo?: boolean
          company_id?: string
          cor?: string
          created_at?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["fin_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "fin_categoria_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_conta: {
        Row: {
          ativo: boolean
          bank_connection_id: string | null
          company_id: string
          cor: string
          created_at: string
          fonte: string
          id: string
          instituicao: string | null
          last_sync_at: string | null
          moeda: string
          nome: string
          provider_account_id: string | null
          saldo_cents: number
          saldo_disponivel_cents: number | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          bank_connection_id?: string | null
          company_id: string
          cor?: string
          created_at?: string
          fonte?: string
          id?: string
          instituicao?: string | null
          last_sync_at?: string | null
          moeda?: string
          nome: string
          provider_account_id?: string | null
          saldo_cents?: number
          saldo_disponivel_cents?: number | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          bank_connection_id?: string | null
          company_id?: string
          cor?: string
          created_at?: string
          fonte?: string
          id?: string
          instituicao?: string | null
          last_sync_at?: string | null
          moeda?: string
          nome?: string
          provider_account_id?: string | null
          saldo_cents?: number
          saldo_disponivel_cents?: number | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_conta_company_id_bank_connection_id_fkey"
            columns: ["company_id", "bank_connection_id"]
            isOneToOne: false
            referencedRelation: "fin_bank_connection"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_conta_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_fatura: {
        Row: {
          cartao_id: string
          company_id: string
          competencia: string
          created_at: string
          fechamento_em: string | null
          id: string
          pago_cents: number
          provider_invoice_id: string | null
          status: string
          total_cents: number
          updated_at: string
          vencimento_em: string
        }
        Insert: {
          cartao_id: string
          company_id: string
          competencia: string
          created_at?: string
          fechamento_em?: string | null
          id?: string
          pago_cents?: number
          provider_invoice_id?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
          vencimento_em: string
        }
        Update: {
          cartao_id?: string
          company_id?: string
          competencia?: string
          created_at?: string
          fechamento_em?: string | null
          id?: string
          pago_cents?: number
          provider_invoice_id?: string | null
          status?: string
          total_cents?: number
          updated_at?: string
          vencimento_em?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_fatura_company_id_cartao_id_fkey"
            columns: ["company_id", "cartao_id"]
            isOneToOne: false
            referencedRelation: "fin_cartao"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_fatura_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_lancamento: {
        Row: {
          ai_command_id: string | null
          anexo_url: string | null
          cartao_id: string | null
          categoria_id: string | null
          company_id: string
          competencia: string
          confidence: number | null
          conta_id: string | null
          contato_numero: string | null
          created_at: string
          created_by: string | null
          crm_card_id: string | null
          descricao: string
          estabelecimento: string | null
          fatura_id: string | null
          fonte: string
          forma_pagamento: Database["public"]["Enums"]["fin_forma"] | null
          id: string
          metadata: Json
          observacao: string | null
          ocorrido_em: string | null
          original_input: string | null
          pago_em: string | null
          parcela_numero: number | null
          parcela_total: number | null
          provider_transaction_id: string | null
          recorrencia_id: string | null
          status: Database["public"]["Enums"]["fin_status"]
          tipo: Database["public"]["Enums"]["fin_tipo"]
          updated_at: string
          valor_cents: number
          vencimento: string
          work_order_id: string | null
        }
        Insert: {
          ai_command_id?: string | null
          anexo_url?: string | null
          cartao_id?: string | null
          categoria_id?: string | null
          company_id: string
          competencia?: string
          confidence?: number | null
          conta_id?: string | null
          contato_numero?: string | null
          created_at?: string
          created_by?: string | null
          crm_card_id?: string | null
          descricao: string
          estabelecimento?: string | null
          fatura_id?: string | null
          fonte?: string
          forma_pagamento?: Database["public"]["Enums"]["fin_forma"] | null
          id?: string
          metadata?: Json
          observacao?: string | null
          ocorrido_em?: string | null
          original_input?: string | null
          pago_em?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          provider_transaction_id?: string | null
          recorrencia_id?: string | null
          status?: Database["public"]["Enums"]["fin_status"]
          tipo: Database["public"]["Enums"]["fin_tipo"]
          updated_at?: string
          valor_cents: number
          vencimento: string
          work_order_id?: string | null
        }
        Update: {
          ai_command_id?: string | null
          anexo_url?: string | null
          cartao_id?: string | null
          categoria_id?: string | null
          company_id?: string
          competencia?: string
          confidence?: number | null
          conta_id?: string | null
          contato_numero?: string | null
          created_at?: string
          created_by?: string | null
          crm_card_id?: string | null
          descricao?: string
          estabelecimento?: string | null
          fatura_id?: string | null
          fonte?: string
          forma_pagamento?: Database["public"]["Enums"]["fin_forma"] | null
          id?: string
          metadata?: Json
          observacao?: string | null
          ocorrido_em?: string | null
          original_input?: string | null
          pago_em?: string | null
          parcela_numero?: number | null
          parcela_total?: number | null
          provider_transaction_id?: string | null
          recorrencia_id?: string | null
          status?: Database["public"]["Enums"]["fin_status"]
          tipo?: Database["public"]["Enums"]["fin_tipo"]
          updated_at?: string
          valor_cents?: number
          vencimento?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fin_lancamento_cartao_company_fkey"
            columns: ["company_id", "cartao_id"]
            isOneToOne: false
            referencedRelation: "fin_cartao"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_lancamento_categoria_company_fkey"
            columns: ["company_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "fin_categoria"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_lancamento_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fin_lancamento_conta_company_fkey"
            columns: ["company_id", "conta_id"]
            isOneToOne: false
            referencedRelation: "fin_conta"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_lancamento_crm_card_company_fkey"
            columns: ["company_id", "crm_card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_lancamento_fatura_company_fkey"
            columns: ["company_id", "fatura_id"]
            isOneToOne: false
            referencedRelation: "fin_fatura"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_lancamento_recorrencia_company_fkey"
            columns: ["company_id", "recorrencia_id"]
            isOneToOne: false
            referencedRelation: "fin_recorrencia"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_lancamento_work_order_company_fkey"
            columns: ["company_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "marcia_work_order"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      fin_meta: {
        Row: {
          acumulado_cents: number
          company_id: string
          cor: string
          created_at: string
          icone: string
          id: string
          nome: string
          objetivo_cents: number
          prazo: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acumulado_cents?: number
          company_id: string
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome: string
          objetivo_cents: number
          prazo?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acumulado_cents?: number
          company_id?: string
          cor?: string
          created_at?: string
          icone?: string
          id?: string
          nome?: string
          objetivo_cents?: number
          prazo?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_meta_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_orcamento: {
        Row: {
          alerta_percentual: number
          categoria_id: string
          company_id: string
          competencia: string
          created_at: string
          id: string
          limite_cents: number
          updated_at: string
        }
        Insert: {
          alerta_percentual?: number
          categoria_id: string
          company_id: string
          competencia: string
          created_at?: string
          id?: string
          limite_cents: number
          updated_at?: string
        }
        Update: {
          alerta_percentual?: number
          categoria_id?: string
          company_id?: string
          competencia?: string
          created_at?: string
          id?: string
          limite_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_orcamento_company_id_categoria_id_fkey"
            columns: ["company_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "fin_categoria"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_orcamento_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_recorrencia: {
        Row: {
          ativo: boolean
          categoria_id: string | null
          company_id: string
          conta_id: string | null
          created_at: string
          descricao: string
          frequencia: string
          id: string
          proxima_data: string
          termina_em: string | null
          tipo: Database["public"]["Enums"]["fin_tipo"]
          updated_at: string
          valor_cents: number
        }
        Insert: {
          ativo?: boolean
          categoria_id?: string | null
          company_id: string
          conta_id?: string | null
          created_at?: string
          descricao: string
          frequencia: string
          id?: string
          proxima_data: string
          termina_em?: string | null
          tipo: Database["public"]["Enums"]["fin_tipo"]
          updated_at?: string
          valor_cents: number
        }
        Update: {
          ativo?: boolean
          categoria_id?: string | null
          company_id?: string
          conta_id?: string | null
          created_at?: string
          descricao?: string
          frequencia?: string
          id?: string
          proxima_data?: string
          termina_em?: string | null
          tipo?: Database["public"]["Enums"]["fin_tipo"]
          updated_at?: string
          valor_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "fin_recorrencia_company_id_categoria_id_fkey"
            columns: ["company_id", "categoria_id"]
            isOneToOne: false
            referencedRelation: "fin_categoria"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_recorrencia_company_id_conta_id_fkey"
            columns: ["company_id", "conta_id"]
            isOneToOne: false
            referencedRelation: "fin_conta"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "fin_recorrencia_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_whatsapp_identity: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          display_name: string | null
          id: string
          last_used_at: string | null
          phone_e164: string
          updated_at: string
          user_id: string
          verified_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          last_used_at?: string | null
          phone_e164: string
          updated_at?: string
          user_id: string
          verified_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          last_used_at?: string | null
          phone_e164?: string
          updated_at?: string
          user_id?: string
          verified_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_whatsapp_identity_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      fin_whatsapp_pairing: {
        Row: {
          code: string
          company_id: string
          created_at: string
          expires_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          expires_at: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fin_whatsapp_pairing_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      google_integration: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          company_id: string
          conectado: boolean
          email: string | null
          expiry: string | null
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          company_id: string
          conectado?: boolean
          email?: string | null
          expiry?: string | null
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          company_id?: string
          conectado?: boolean
          email?: string | null
          expiry?: string | null
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_integration_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      google_oauth_state: {
        Row: {
          company_id: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          redirect_uri: string
          session_id: string
          state_hash: string
          user_id: string
        }
        Insert: {
          company_id: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          redirect_uri: string
          session_id: string
          state_hash: string
          user_id: string
        }
        Update: {
          company_id?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          redirect_uri?: string
          session_id?: string
          state_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_oauth_state_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_evento: {
        Row: {
          card_id: string
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          tipo: string
        }
        Insert: {
          card_id: string
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo: string
        }
        Update: {
          card_id?: string
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_evento_card_company_fkey"
            columns: ["company_id", "card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "lead_evento_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_nota: {
        Row: {
          autor_id: string | null
          card_id: string
          company_id: string
          created_at: string
          id: string
          texto: string
        }
        Insert: {
          autor_id?: string | null
          card_id: string
          company_id: string
          created_at?: string
          id?: string
          texto: string
        }
        Update: {
          autor_id?: string | null
          card_id?: string
          company_id?: string
          created_at?: string
          id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_nota_card_company_fkey"
            columns: ["company_id", "card_id"]
            isOneToOne: false
            referencedRelation: "crm_cards"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "lead_nota_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      marcia_ai_command: {
        Row: {
          company_id: string
          created_at: string
          draft: Json
          error_message: string | null
          executed_at: string | null
          id: string
          intent: string
          messages: Json
          result: Json | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          draft?: Json
          error_message?: string | null
          executed_at?: string | null
          id?: string
          intent?: string
          messages?: Json
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          draft?: Json
          error_message?: string | null
          executed_at?: string | null
          id?: string
          intent?: string
          messages?: Json
          result?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marcia_ai_command_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      marcia_appointment: {
        Row: {
          blocked_ends_at: string
          blocked_starts_at: string
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          ends_at: string
          hold_expires_at: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          occupies_slot: boolean
          price_cents: number
          professional_id: string
          service_id: string
          source: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          blocked_ends_at: string
          blocked_starts_at: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          ends_at: string
          hold_expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          occupies_slot?: boolean
          price_cents?: number
          professional_id: string
          service_id: string
          source?: string
          starts_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          blocked_ends_at?: string
          blocked_starts_at?: string
          cancellation_reason?: string | null
          cancelled_at?: string | null
          company_id?: string
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          ends_at?: string
          hold_expires_at?: string | null
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          occupies_slot?: boolean
          price_cents?: number
          professional_id?: string
          service_id?: string
          source?: string
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_appointment_company_id_customer_id_fkey"
            columns: ["company_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "marcia_customer"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "marcia_appointment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcia_appointment_company_id_professional_id_fkey"
            columns: ["company_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "marcia_professional"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "marcia_appointment_company_id_service_id_fkey"
            columns: ["company_id", "service_id"]
            isOneToOne: false
            referencedRelation: "marcia_service"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      marcia_appointment_history: {
        Row: {
          actor_user_id: string | null
          after_data: Json | null
          appointment_id: string
          before_data: Json | null
          company_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: number
          note: string | null
          to_status: string | null
        }
        Insert: {
          actor_user_id?: string | null
          after_data?: Json | null
          appointment_id: string
          before_data?: Json | null
          company_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: never
          note?: string | null
          to_status?: string | null
        }
        Update: {
          actor_user_id?: string | null
          after_data?: Json | null
          appointment_id?: string
          before_data?: Json | null
          company_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: never
          note?: string | null
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marcia_appointment_history_company_id_appointment_id_fkey"
            columns: ["company_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "marcia_appointment"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "marcia_appointment_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      marcia_availability_rule: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          ends_at: string
          id: string
          professional_id: string
          starts_at: string
          updated_at: string
          valid_from: string | null
          valid_until: string | null
          weekday: number
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          ends_at: string
          id?: string
          professional_id: string
          starts_at: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          weekday: number
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          ends_at?: string
          id?: string
          professional_id?: string
          starts_at?: string
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "marcia_availability_rule_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcia_availability_rule_company_id_professional_id_fkey"
            columns: ["company_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "marcia_professional"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      marcia_customer: {
        Row: {
          company_id: string
          created_at: string
          document: string | null
          email: string | null
          id: string
          metadata: Json
          name: string
          notes: string | null
          phone_e164: string | null
          tags: string[]
          updated_at: string
          whatsapp_opt_in_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          name: string
          notes?: string | null
          phone_e164?: string | null
          tags?: string[]
          updated_at?: string
          whatsapp_opt_in_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          metadata?: Json
          name?: string
          notes?: string | null
          phone_e164?: string | null
          tags?: string[]
          updated_at?: string
          whatsapp_opt_in_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marcia_customer_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      marcia_notification: {
        Row: {
          body: string | null
          company_id: string
          created_at: string
          data: Json
          entity_id: string | null
          entity_type: string | null
          id: string
          read_at: string | null
          recipient_user_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          company_id: string
          created_at?: string
          data?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          recipient_user_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          company_id?: string
          created_at?: string
          data?: Json
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          recipient_user_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_notification_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      marcia_outbox_event: {
        Row: {
          aggregate_id: string
          aggregate_type: string
          attempts: number
          available_at: string
          company_id: string
          created_at: string
          destination: string
          event_type: string
          id: string
          idempotency_key: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          payload: Json
          processed_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          aggregate_id: string
          aggregate_type: string
          attempts?: number
          available_at?: string
          company_id: string
          created_at?: string
          destination?: string
          event_type: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          aggregate_id?: string
          aggregate_type?: string
          attempts?: number
          available_at?: string
          company_id?: string
          created_at?: string
          destination?: string
          event_type?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          locked_at?: string | null
          locked_by?: string | null
          payload?: Json
          processed_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_outbox_event_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      marcia_professional: {
        Row: {
          active: boolean
          avatar_url: string | null
          color: string
          company_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone_e164: string | null
          timezone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          active?: boolean
          avatar_url?: string | null
          color?: string
          company_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone_e164?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          active?: boolean
          avatar_url?: string | null
          color?: string
          company_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone_e164?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marcia_professional_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      marcia_professional_service: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          professional_id: string
          service_id: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          professional_id: string
          service_id: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          professional_id?: string
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_professional_service_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcia_professional_service_company_id_professional_id_fkey"
            columns: ["company_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "marcia_professional"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "marcia_professional_service_company_id_service_id_fkey"
            columns: ["company_id", "service_id"]
            isOneToOne: false
            referencedRelation: "marcia_service"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      marcia_push_subscription: {
        Row: {
          active: boolean
          auth_secret: string
          company_id: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          auth_secret: string
          company_id: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          auth_secret?: string
          company_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_push_subscription_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      marcia_schedule_block: {
        Row: {
          active: boolean
          company_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          external_key: string | null
          id: string
          professional_id: string | null
          reason: string | null
          source: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          company_id: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          external_key?: string | null
          id?: string
          professional_id?: string | null
          reason?: string | null
          source?: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          company_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          external_key?: string | null
          id?: string
          professional_id?: string | null
          reason?: string | null
          source?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_schedule_block_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcia_schedule_block_company_id_professional_id_fkey"
            columns: ["company_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "marcia_professional"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      marcia_service: {
        Row: {
          active: boolean
          buffer_after_minutes: number
          buffer_before_minutes: number
          color: string
          company_id: string
          created_at: string
          deposit_cents: number
          description: string | null
          duration_minutes: number
          id: string
          name: string
          price_cents: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          color?: string
          company_id: string
          created_at?: string
          deposit_cents?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          name: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          buffer_after_minutes?: number
          buffer_before_minutes?: number
          color?: string
          company_id?: string
          created_at?: string
          deposit_cents?: number
          description?: string | null
          duration_minutes?: number
          id?: string
          name?: string
          price_cents?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_service_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      marcia_sync_record: {
        Row: {
          company_id: string
          created_at: string
          etag: string | null
          external_id: string | null
          id: string
          internal_id: string
          last_error: string | null
          last_synced_at: string | null
          metadata: Json
          provider: string
          resource_type: string
          status: string
          sync_token: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          etag?: string | null
          external_id?: string | null
          id?: string
          internal_id: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          provider: string
          resource_type: string
          status?: string
          sync_token?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          etag?: string | null
          external_id?: string | null
          id?: string
          internal_id?: string
          last_error?: string | null
          last_synced_at?: string | null
          metadata?: Json
          provider?: string
          resource_type?: string
          status?: string
          sync_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_sync_record_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      marcia_work_order: {
        Row: {
          ai_command_id: string | null
          appointment_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_approved_at: string | null
          customer_id: string
          customer_signature_path: string | null
          description: string | null
          diagnosis: string | null
          discount_cents: number
          id: string
          internal_notes: string | null
          number: number
          professional_id: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          subtotal_cents: number
          summary: string
          total_cents: number
          updated_at: string
        }
        Insert: {
          ai_command_id?: string | null
          appointment_id?: string | null
          company_id: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_approved_at?: string | null
          customer_id: string
          customer_signature_path?: string | null
          description?: string | null
          diagnosis?: string | null
          discount_cents?: number
          id?: string
          internal_notes?: string | null
          number?: never
          professional_id?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          subtotal_cents?: number
          summary: string
          total_cents?: number
          updated_at?: string
        }
        Update: {
          ai_command_id?: string | null
          appointment_id?: string | null
          company_id?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_approved_at?: string | null
          customer_id?: string
          customer_signature_path?: string | null
          description?: string | null
          diagnosis?: string | null
          discount_cents?: number
          id?: string
          internal_notes?: string | null
          number?: never
          professional_id?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string
          subtotal_cents?: number
          summary?: string
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_work_order_company_id_appointment_id_fkey"
            columns: ["company_id", "appointment_id"]
            isOneToOne: false
            referencedRelation: "marcia_appointment"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "marcia_work_order_company_id_customer_id_fkey"
            columns: ["company_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "marcia_customer"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "marcia_work_order_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcia_work_order_company_id_professional_id_fkey"
            columns: ["company_id", "professional_id"]
            isOneToOne: false
            referencedRelation: "marcia_professional"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      marcia_work_order_attachment: {
        Row: {
          company_id: string
          created_at: string
          file_name: string | null
          id: string
          kind: string
          mime_type: string | null
          size_bytes: number | null
          storage_bucket: string
          storage_path: string
          uploaded_by: string | null
          work_order_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_bucket: string
          storage_path: string
          uploaded_by?: string | null
          work_order_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string | null
          id?: string
          kind?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_bucket?: string
          storage_path?: string
          uploaded_by?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_work_order_attachment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcia_work_order_attachment_company_id_work_order_id_fkey"
            columns: ["company_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "marcia_work_order"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      marcia_work_order_checklist: {
        Row: {
          company_id: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          label: string
          position: number
          required: boolean
          updated_at: string
          work_order_id: string
        }
        Insert: {
          company_id: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          label: string
          position?: number
          required?: boolean
          updated_at?: string
          work_order_id: string
        }
        Update: {
          company_id?: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          label?: string
          position?: number
          required?: boolean
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_work_order_checklist_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcia_work_order_checklist_company_id_work_order_id_fkey"
            columns: ["company_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "marcia_work_order"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      marcia_work_order_history: {
        Row: {
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          company_id: string
          created_at: string
          event_type: string
          from_status: string | null
          id: number
          note: string | null
          to_status: string | null
          work_order_id: string
        }
        Insert: {
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id: string
          created_at?: string
          event_type: string
          from_status?: string | null
          id?: never
          note?: string | null
          to_status?: string | null
          work_order_id: string
        }
        Update: {
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          company_id?: string
          created_at?: string
          event_type?: string
          from_status?: string | null
          id?: never
          note?: string | null
          to_status?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_work_order_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcia_work_order_history_company_id_work_order_id_fkey"
            columns: ["company_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "marcia_work_order"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      marcia_work_order_item: {
        Row: {
          company_id: string
          created_at: string
          description: string
          id: string
          kind: string
          position: number
          quantity: number
          service_id: string | null
          total_cents: number | null
          unit_price_cents: number
          updated_at: string
          work_order_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          description: string
          id?: string
          kind?: string
          position?: number
          quantity?: number
          service_id?: string | null
          total_cents?: number | null
          unit_price_cents?: number
          updated_at?: string
          work_order_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          kind?: string
          position?: number
          quantity?: number
          service_id?: string | null
          total_cents?: number | null
          unit_price_cents?: number
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marcia_work_order_item_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marcia_work_order_item_company_id_service_id_fkey"
            columns: ["company_id", "service_id"]
            isOneToOne: false
            referencedRelation: "marcia_service"
            referencedColumns: ["company_id", "id"]
          },
          {
            foreignKeyName: "marcia_work_order_item_company_id_work_order_id_fkey"
            columns: ["company_id", "work_order_id"]
            isOneToOne: false
            referencedRelation: "marcia_work_order"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      mensagens: {
        Row: {
          autor: string
          company_id: string
          contato_nome: string | null
          created_at: string
          direcao: string
          id: string
          numero: string
          texto: string
          user_id: string
          whatsapp_message_id: string | null
        }
        Insert: {
          autor: string
          company_id: string
          contato_nome?: string | null
          created_at?: string
          direcao: string
          id?: string
          numero: string
          texto: string
          user_id: string
          whatsapp_message_id?: string | null
        }
        Update: {
          autor?: string
          company_id?: string
          contato_nome?: string | null
          created_at?: string
          direcao?: string
          id?: string
          numero?: string
          texto?: string
          user_id?: string
          whatsapp_message_id?: string | null
        }
        Relationships: []
      }
      message_quota_reservation: {
        Row: {
          attempted_count: number
          company_id: string
          created_at: string
          id: string
          period_start: string
          ref: string
          reserved_count: number
          sent_count: number | null
          settled_at: string | null
          updated_at: string
        }
        Insert: {
          attempted_count?: number
          company_id: string
          created_at?: string
          id?: string
          period_start: string
          ref: string
          reserved_count: number
          sent_count?: number | null
          settled_at?: string | null
          updated_at?: string
        }
        Update: {
          attempted_count?: number
          company_id?: string
          created_at?: string
          id?: string
          period_start?: string
          ref?: string
          reserved_count?: number
          sent_count?: number | null
          settled_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_quota_reservation_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      message_template: {
        Row: {
          atalho: string
          company_id: string
          created_at: string
          id: string
          texto: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          atalho: string
          company_id: string
          created_at?: string
          id?: string
          texto: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          atalho?: string
          company_id?: string
          created_at?: string
          id?: string
          texto?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_template_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      plan: {
        Row: {
          ativo: boolean
          checkout_mode: string
          checkout_url: string | null
          created_at: string
          creditos_mensais: number
          creditos_trial: number
          descricao: string | null
          destaque: boolean
          features: Json
          id: string
          intervalo: string
          limite_contatos: number
          limite_instancias: number
          limite_mensagens: number
          limite_usuarios: number
          moeda: string
          nome: string
          ordem: number
          paddle_price_id: string | null
          paddle_product_id: string | null
          preco_cents: number
          slug: string
          stripe_price_id: string | null
          stripe_product_id: string | null
          trial_days: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          checkout_mode?: string
          checkout_url?: string | null
          created_at?: string
          creditos_mensais?: number
          creditos_trial?: number
          descricao?: string | null
          destaque?: boolean
          features?: Json
          id?: string
          intervalo?: string
          limite_contatos?: number
          limite_instancias?: number
          limite_mensagens?: number
          limite_usuarios?: number
          moeda?: string
          nome: string
          ordem?: number
          paddle_price_id?: string | null
          paddle_product_id?: string | null
          preco_cents?: number
          slug: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          checkout_mode?: string
          checkout_url?: string | null
          created_at?: string
          creditos_mensais?: number
          creditos_trial?: number
          descricao?: string | null
          destaque?: boolean
          features?: Json
          id?: string
          intervalo?: string
          limite_contatos?: number
          limite_instancias?: number
          limite_mensagens?: number
          limite_usuarios?: number
          moeda?: string
          nome?: string
          ordem?: number
          paddle_price_id?: string | null
          paddle_product_id?: string | null
          preco_cents?: number
          slug?: string
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          trial_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_channel_switch_log: {
        Row: {
          actor_id: string | null
          created_at: string
          diagnostic: Json
          from_provider: string | null
          id: string
          to_provider: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          diagnostic?: Json
          from_provider?: string | null
          id?: string
          to_provider?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          diagnostic?: Json
          from_provider?: string | null
          id?: string
          to_provider?: string | null
        }
        Relationships: []
      }
      platform_integration_secret: {
        Row: {
          ciphertext: string
          field: string
          iv: string
          last4: string | null
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ciphertext: string
          field: string
          iv: string
          last4?: string | null
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ciphertext?: string
          field?: string
          iv?: string
          last4?: string | null
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      platform_integration_status: {
        Row: {
          last_error: string | null
          provider: string
          test_ok: boolean | null
          tested_at: string | null
          updated_at: string
        }
        Insert: {
          last_error?: string | null
          provider: string
          test_ok?: boolean | null
          tested_at?: string | null
          updated_at?: string
        }
        Update: {
          last_error?: string | null
          provider?: string
          test_ok?: boolean | null
          tested_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_support_channel: {
        Row: {
          active_provider: string | null
          created_at: string
          evolution_purchase_message: string | null
          id: boolean
          instance_name: string | null
          last_error: string | null
          last_sync_at: string | null
          meta_template_body: string | null
          meta_template_checked_at: string | null
          meta_template_has_button: boolean
          meta_template_language: string
          meta_template_name: string | null
          meta_template_status: string | null
          phone_e164: string | null
          provider: string
          status: string
          switched_at: string | null
          switched_by: string | null
          updated_at: string
          webhook_configured_at: string | null
          webhook_token: string
        }
        Insert: {
          active_provider?: string | null
          created_at?: string
          evolution_purchase_message?: string | null
          id?: boolean
          instance_name?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          meta_template_body?: string | null
          meta_template_checked_at?: string | null
          meta_template_has_button?: boolean
          meta_template_language?: string
          meta_template_name?: string | null
          meta_template_status?: string | null
          phone_e164?: string | null
          provider?: string
          status?: string
          switched_at?: string | null
          switched_by?: string | null
          updated_at?: string
          webhook_configured_at?: string | null
          webhook_token?: string
        }
        Update: {
          active_provider?: string | null
          created_at?: string
          evolution_purchase_message?: string | null
          id?: boolean
          instance_name?: string | null
          last_error?: string | null
          last_sync_at?: string | null
          meta_template_body?: string | null
          meta_template_checked_at?: string | null
          meta_template_has_button?: boolean
          meta_template_language?: string
          meta_template_name?: string | null
          meta_template_status?: string | null
          phone_e164?: string | null
          provider?: string
          status?: string
          switched_at?: string | null
          switched_by?: string | null
          updated_at?: string
          webhook_configured_at?: string | null
          webhook_token?: string
        }
        Relationships: []
      }
      platform_support_conversation: {
        Row: {
          contact_name: string | null
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          phone_e164: string
          status: string
          subscriber_company_id: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          phone_e164: string
          status?: string
          subscriber_company_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          phone_e164?: string
          status?: string
          subscriber_company_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_conversation_subscriber_company_id_fkey"
            columns: ["subscriber_company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_support_message: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          delivery_status: string
          direction: string
          id: string
          message_type: string
          provider_message_id: string | null
          provider_payload: Json
          sender_type: string
        }
        Insert: {
          body?: string
          conversation_id: string
          created_at?: string
          delivery_status?: string
          direction: string
          id?: string
          message_type?: string
          provider_message_id?: string | null
          provider_payload?: Json
          sender_type: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          delivery_status?: string
          direction?: string
          id?: string
          message_type?: string
          provider_message_id?: string | null
          provider_payload?: Json
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_support_message_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "platform_support_conversation"
            referencedColumns: ["id"]
          },
        ]
      }
      produto: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          preco: number
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          preco?: number
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          preco?: number
        }
        Relationships: [
          {
            foreignKeyName: "produto_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          cargo: string | null
          cpf: string | null
          created_at: string
          email: string | null
          nome: string | null
          nome_completo: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          nome?: string | null
          nome_completo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          nome?: string | null
          nome_completo?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      purchase_onboarding: {
        Row: {
          activation_code_hash: string | null
          activation_expires_at: string | null
          activation_token_hash: string | null
          activation_used_at: string | null
          attempts: number
          buyer_email: string | null
          buyer_name: string | null
          buyer_phone_e164: string | null
          channel_provider: string | null
          company_id: string | null
          created_at: string
          delivered_at: string | null
          dry_run_preview: Json | null
          failed_at: string | null
          id: string
          kind: string
          last_error: string | null
          locked_until: string | null
          next_attempt_at: string
          paired_at: string | null
          paired_phone_e164: string | null
          phone_source: string | null
          provider_message_id: string | null
          read_at: string | null
          sent_at: string | null
          source: string
          source_event_key: string
          status: string
          status_detail: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activation_code_hash?: string | null
          activation_expires_at?: string | null
          activation_token_hash?: string | null
          activation_used_at?: string | null
          attempts?: number
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone_e164?: string | null
          channel_provider?: string | null
          company_id?: string | null
          created_at?: string
          delivered_at?: string | null
          dry_run_preview?: Json | null
          failed_at?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          locked_until?: string | null
          next_attempt_at?: string
          paired_at?: string | null
          paired_phone_e164?: string | null
          phone_source?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          source: string
          source_event_key: string
          status?: string
          status_detail?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activation_code_hash?: string | null
          activation_expires_at?: string | null
          activation_token_hash?: string | null
          activation_used_at?: string | null
          attempts?: number
          buyer_email?: string | null
          buyer_name?: string | null
          buyer_phone_e164?: string | null
          channel_provider?: string | null
          company_id?: string | null
          created_at?: string
          delivered_at?: string | null
          dry_run_preview?: Json | null
          failed_at?: string | null
          id?: string
          kind?: string
          last_error?: string | null
          locked_until?: string | null
          next_attempt_at?: string
          paired_at?: string | null
          paired_phone_e164?: string | null
          phone_source?: string | null
          provider_message_id?: string | null
          read_at?: string | null
          sent_at?: string | null
          source?: string
          source_event_key?: string
          status?: string
          status_detail?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_onboarding_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_onboarding_event: {
        Row: {
          actor_id: string | null
          created_at: string
          detail: string | null
          from_status: string | null
          id: string
          onboarding_id: string
          to_status: string | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          from_status?: string | null
          id?: string
          onboarding_id: string
          to_status?: string | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          from_status?: string | null
          id?: string
          onboarding_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_onboarding_event_onboarding_id_fkey"
            columns: ["onboarding_id"]
            isOneToOne: false
            referencedRelation: "purchase_onboarding"
            referencedColumns: ["id"]
          },
        ]
      }
      remix_installation_guard: {
        Row: {
          activation_code_hash: string | null
          claim_origin: string | null
          claimed_at: string | null
          claimed_by: string | null
          id: boolean
          updated_at: string
        }
        Insert: {
          activation_code_hash?: string | null
          claim_origin?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          id?: boolean
          updated_at?: string
        }
        Update: {
          activation_code_hash?: string | null
          claim_origin?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      stripe_event_log: {
        Row: {
          company_id: string | null
          created_at: string
          error: string | null
          id: string
          processed: boolean
          type: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          error?: string | null
          id: string
          processed?: boolean
          type: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          error?: string | null
          id?: string
          processed?: boolean
          type?: string
        }
        Relationships: []
      }
      subscription: {
        Row: {
          buyer_email: string | null
          cancel_at_period_end: boolean
          canceled_at: string | null
          company_id: string
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          external_customer_id: string | null
          external_subscription_id: string | null
          id: string
          metadata: Json
          next_billing_amount_cents: number | null
          paddle_customer_id: string | null
          paddle_subscription_id: string | null
          payment_method_brand: string | null
          payment_method_exp: string | null
          payment_method_last4: string | null
          plan_id: string | null
          provider: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          buyer_email?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          company_id: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          metadata?: Json
          next_billing_amount_cents?: number | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          payment_method_brand?: string | null
          payment_method_exp?: string | null
          payment_method_last4?: string | null
          plan_id?: string | null
          provider?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          buyer_email?: string | null
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          company_id?: string
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          external_customer_id?: string | null
          external_subscription_id?: string | null
          id?: string
          metadata?: Json
          next_billing_amount_cents?: number | null
          paddle_customer_id?: string | null
          paddle_subscription_id?: string | null
          payment_method_brand?: string | null
          payment_method_exp?: string | null
          payment_method_last4?: string | null
          plan_id?: string | null
          provider?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plan"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invite_provision: {
        Row: {
          auth_created_here: boolean
          company_id: string
          created_at: string
          created_by: string
          email: string
          id: string
          last_error: string | null
          linked_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_created_here?: boolean
          company_id: string
          created_at?: string
          created_by: string
          email: string
          id?: string
          last_error?: string | null
          linked_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_created_here?: boolean
          company_id?: string
          created_at?: string
          created_by?: string
          email?: string
          id?: string
          last_error?: string | null
          linked_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invite_provision_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_delivery_log: {
        Row: {
          company_id: string
          created_at: string
          endpoint_id: string | null
          erro: string | null
          evento: string
          id: string
          status_code: number | null
        }
        Insert: {
          company_id: string
          created_at?: string
          endpoint_id?: string | null
          erro?: string | null
          evento: string
          id?: string
          status_code?: number | null
        }
        Update: {
          company_id?: string
          created_at?: string
          endpoint_id?: string | null
          erro?: string | null
          evento?: string
          id?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_delivery_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "webhook_delivery_log_endpoint_company_fkey"
            columns: ["company_id", "endpoint_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoint"
            referencedColumns: ["company_id", "id"]
          },
        ]
      }
      webhook_endpoint: {
        Row: {
          ativo: boolean
          company_id: string
          created_at: string
          eventos: string[]
          id: string
          nome: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          ativo?: boolean
          company_id: string
          created_at?: string
          eventos?: string[]
          id?: string
          nome: string
          secret?: string
          updated_at?: string
          url: string
        }
        Update: {
          ativo?: boolean
          company_id?: string
          created_at?: string
          eventos?: string[]
          id?: string
          nome?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoint_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          company_id: string
          instance_name: string
          numero: string | null
          status: string
          updated_at: string
          user_id: string
          webhook_configured_at: string | null
          webhook_token: string
        }
        Insert: {
          company_id: string
          instance_name: string
          numero?: string | null
          status?: string
          updated_at?: string
          user_id: string
          webhook_configured_at?: string | null
          webhook_token?: string
        }
        Update: {
          company_id?: string
          instance_name?: string
          numero?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          webhook_configured_at?: string | null
          webhook_token?: string
        }
        Relationships: []
      }
      whatsapp_status_inbox: {
        Row: {
          created_at: string
          error: string | null
          id: string
          processed_at: string | null
          provider: string
          provider_message_id: string
          provider_ts: string | null
          status: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          provider: string
          provider_message_id: string
          provider_ts?: string | null
          status: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          provider?: string
          provider_message_id?: string
          provider_ts?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_remix_instance: {
        Args: {
          _activation_code?: string
          _claim_owner?: boolean
          _company_name?: string
        }
        Returns: {
          claimed_super_admin: boolean
          company_id: string
          created_company: boolean
          needs_onboarding: boolean
        }[]
      }
      bootstrap_remix_instance_legacy_20261019: {
        Args: {
          _activation_code?: string
          _claim_owner?: boolean
          _company_name?: string
        }
        Returns: {
          claimed_super_admin: boolean
          company_id: string
          created_company: boolean
          needs_onboarding: boolean
        }[]
      }
      claim_super_admin_if_empty: { Args: never; Returns: undefined }
      company_finance_enabled: {
        Args: { _company_id: string }
        Returns: boolean
      }
      company_has_plan_feature: {
        Args: { _company_id: string; _feature: string }
        Returns: boolean
      }
      consume_ai_credit: {
        Args: { _company_id: string; _ref?: string }
        Returns: boolean
      }
      create_checkout_company_atomic: {
        Args: {
          _company_name: string
          _plan_slug: string
          _slug_base: string
          _user_id: string
        }
        Returns: string
      }
      create_company_with_owner_atomic: {
        Args: {
          _company_name: string
          _force_password_change?: boolean
          _idempotency_key: string
          _owner_id: string
          _plan_id: string
          _slug_base: string
          _trial_days?: number
        }
        Returns: string
      }
      current_company_id: { Args: never; Returns: string }
      current_user_requires_password_change: { Args: never; Returns: boolean }
      deactivate_webhook_endpoint_secure: {
        Args: { _company_id: string; _endpoint_id: string }
        Returns: boolean
      }
      fin_enable_for_company: {
        Args: { _company_id: string; _enable: boolean }
        Returns: undefined
      }
      get_public_clone_brand: {
        Args: never
        Returns: {
          assistant_name: string
          avatar_url: string
          description: string
          icon_url: string
          logo_url: string
          primary_color: string
          product_name: string
          short_name: string
          tagline: string
        }[]
      }
      grant_company_trial: {
        Args: { _company_id: string; _credits: number; _days: number }
        Returns: {
          creditos_saldo: number
          trial_ate: string
        }[]
      }
      grant_credits: {
        Args: { _company_id: string; _motivo?: string; _qtd: number }
        Returns: number
      }
      has_company_access: { Args: { _company_id: string }; Returns: boolean }
      has_company_role: {
        Args: { _company_id: string; _roles: string[] }
        Returns: boolean
      }
      is_company_operational: {
        Args: { _company_id: string }
        Returns: boolean
      }
      is_remix_installation_claimed: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      marcia_cancel_appointment: {
        Args: {
          p_appointment_id: string
          p_company_id: string
          p_reason?: string
        }
        Returns: {
          blocked_ends_at: string
          blocked_starts_at: string
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          ends_at: string
          hold_expires_at: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          occupies_slot: boolean
          price_cents: number
          professional_id: string
          service_id: string
          source: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marcia_appointment"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marcia_claim_outbox: {
        Args: { p_limit?: number; p_worker_id: string }
        Returns: {
          aggregate_id: string
          aggregate_type: string
          attempts: number
          available_at: string
          company_id: string
          created_at: string
          destination: string
          event_type: string
          id: string
          idempotency_key: string
          last_error: string | null
          locked_at: string | null
          locked_by: string | null
          payload: Json
          processed_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "marcia_outbox_event"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      marcia_confirm_appointment: {
        Args: { p_appointment_id: string; p_company_id: string }
        Returns: {
          blocked_ends_at: string
          blocked_starts_at: string
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          ends_at: string
          hold_expires_at: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          occupies_slot: boolean
          price_cents: number
          professional_id: string
          service_id: string
          source: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marcia_appointment"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marcia_consume_google_oauth_state: {
        Args: { _redirect_uri: string; _state_hash: string }
        Returns: Json
      }
      marcia_create_work_order_from_appointment: {
        Args: { p_appointment_id: string; p_company_id: string }
        Returns: {
          ai_command_id: string | null
          appointment_id: string | null
          company_id: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_approved_at: string | null
          customer_id: string
          customer_signature_path: string | null
          description: string | null
          diagnosis: string | null
          discount_cents: number
          id: string
          internal_notes: string | null
          number: number
          professional_id: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string
          subtotal_cents: number
          summary: string
          total_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marcia_work_order"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marcia_disconnect_google: {
        Args: { p_company_id: string }
        Returns: undefined
      }
      marcia_find_auth_user_by_email: {
        Args: { _email: string }
        Returns: string
      }
      marcia_finish_outbox: {
        Args: {
          p_error?: string
          p_event_id: string
          p_retry_after_seconds?: number
          p_succeeded: boolean
          p_worker_id: string
        }
        Returns: undefined
      }
      marcia_issue_google_oauth_state: {
        Args: {
          _company_id: string
          _redirect_uri: string
          _state_hash: string
          _ttl_seconds?: number
        }
        Returns: undefined
      }
      marcia_replace_google_busy_blocks: {
        Args: {
          p_company_id: string
          p_intervals: Json
          p_range_end: string
          p_range_start: string
        }
        Returns: number
      }
      marcia_reschedule_appointment: {
        Args: {
          p_appointment_id: string
          p_company_id: string
          p_hold_minutes?: number
          p_starts_at: string
        }
        Returns: {
          blocked_ends_at: string
          blocked_starts_at: string
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          ends_at: string
          hold_expires_at: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          occupies_slot: boolean
          price_cents: number
          professional_id: string
          service_id: string
          source: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marcia_appointment"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marcia_reserve_appointment: {
        Args: {
          p_company_id: string
          p_customer_id: string
          p_hold_minutes?: number
          p_idempotency_key?: string
          p_notes?: string
          p_professional_id: string
          p_service_id: string
          p_source?: string
          p_starts_at: string
          p_status?: string
          p_title?: string
        }
        Returns: {
          blocked_ends_at: string
          blocked_starts_at: string
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          ends_at: string
          hold_expires_at: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          occupies_slot: boolean
          price_cents: number
          professional_id: string
          service_id: string
          source: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marcia_appointment"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      marcia_update_appointment_status: {
        Args: {
          p_appointment_id: string
          p_company_id: string
          p_status: string
        }
        Returns: {
          blocked_ends_at: string
          blocked_starts_at: string
          cancellation_reason: string | null
          cancelled_at: string | null
          company_id: string
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          ends_at: string
          hold_expires_at: string | null
          id: string
          idempotency_key: string | null
          notes: string | null
          occupies_slot: boolean
          price_cents: number
          professional_id: string
          service_id: string
          source: string
          starts_at: string
          status: string
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "marcia_appointment"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_message_quota_attempt: {
        Args: { _attempted_count: number; _company_id: string; _ref: string }
        Returns: boolean
      }
      migrate_generated_assistant_presentation: {
        Args: {
          _next_name: string
          _presentation: string
          _previous_name: string
        }
        Returns: string
      }
      persist_outbound_messages_and_finalize_quota: {
        Args: {
          _author: string
          _company_id: string
          _contact_name: string
          _messages: Json
          _number: string
          _ref: string
          _uncertain_count?: number
          _user_id: string
        }
        Returns: number
      }
      purchase_onboarding_status_rank: { Args: { _s: string }; Returns: number }
      refund_ai_credit: {
        Args: { _company_id: string; _ref?: string }
        Returns: number
      }
      reserve_csat_send: {
        Args: {
          _company_id: string
          _contact_name: string
          _number: string
          _sent_by: string
        }
        Returns: Json
      }
      reserve_message_quota: {
        Args: { _company_id: string; _quantity?: number; _ref: string }
        Returns: boolean
      }
      resolve_company_provision_result: {
        Args: { _idempotency_key: string; _owner_id: string }
        Returns: string
      }
      revoke_api_token_secure: {
        Args: { _company_id: string; _token_id: string }
        Returns: boolean
      }
      seed_fin_categorias: { Args: { _company_id: string }; Returns: undefined }
      seed_finance_personal_categories: {
        Args: { _company_id: string }
        Returns: undefined
      }
      set_clone_brand_config_atomic: {
        Args: {
          _assistant_name: string
          _avatar_url: string
          _description: string
          _icon_url: string
          _logo_url: string
          _primary_color: string
          _product_name: string
          _short_name: string
          _tagline: string
        }
        Returns: {
          assistant_name: string
          avatar_url: string
          description: string
          icon_url: string
          logo_url: string
          primary_color: string
          product_name: string
          short_name: string
          tagline: string
        }[]
      }
      set_company_member_active_secure: {
        Args: {
          _company_id: string
          _membership_id: string
          _target_active: boolean
        }
        Returns: string
      }
      set_company_member_role_secure: {
        Args: {
          _company_id: string
          _membership_id: string
          _target_role: Database["public"]["Enums"]["tenant_role"]
        }
        Returns: string
      }
      settle_message_quota: {
        Args: { _company_id: string; _ref: string; _sent_count: number }
        Returns: boolean
      }
      switch_central_channel: {
        Args: { _diagnostic?: Json; _to: string }
        Returns: string
      }
      topup_plan_credits: {
        Args: { _company_id: string; _plan_slug: string }
        Returns: number
      }
      upsert_company_member_secure: {
        Args: {
          _company_id: string
          _force_password_change?: boolean
          _role: Database["public"]["Enums"]["tenant_role"]
          _target_user_id: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "super_admin"
      campaign_status:
        | "rascunho"
        | "agendada"
        | "enviando"
        | "pausada"
        | "concluida"
        | "cancelada"
      campaign_target_status: "pendente" | "enviado" | "falhou" | "pulado"
      fin_forma:
        | "pix"
        | "boleto"
        | "cartao"
        | "dinheiro"
        | "transferencia"
        | "outro"
      fin_status: "pendente" | "pago" | "atrasado" | "cancelado"
      fin_tipo: "receita" | "despesa"
      stage_tipo: "normal" | "ganho" | "perda"
      tenant_role: "owner" | "admin" | "atendente"
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
    Enums: {
      app_role: ["super_admin"],
      campaign_status: [
        "rascunho",
        "agendada",
        "enviando",
        "pausada",
        "concluida",
        "cancelada",
      ],
      campaign_target_status: ["pendente", "enviado", "falhou", "pulado"],
      fin_forma: [
        "pix",
        "boleto",
        "cartao",
        "dinheiro",
        "transferencia",
        "outro",
      ],
      fin_status: ["pendente", "pago", "atrasado", "cancelado"],
      fin_tipo: ["receita", "despesa"],
      stage_tipo: ["normal", "ganho", "perda"],
      tenant_role: ["owner", "admin", "atendente"],
    },
  },
} as const
