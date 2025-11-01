-- Corrigir função obter_proximo_numero_sequencial removendo agregação com FOR UPDATE
CREATE OR REPLACE FUNCTION obter_proximo_numero_sequencial(condominio_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    ultimo_numero INTEGER;
BEGIN
    SELECT id_sequencial
    INTO ultimo_numero
    FROM vistorias
    WHERE condominio_id = condominio_uuid
    ORDER BY id_sequencial DESC
    FOR UPDATE
    LIMIT 1;

    RETURN COALESCE(ultimo_numero, 0) + 1;
END;
$$ LANGUAGE plpgsql;
