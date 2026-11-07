-- Bekal Pagi: lindungi kolom tarif dari akses langsung pengguna Staff.
-- Jalankan di Supabase SQL Editor setelah commit aplikasi 906078a.

BEGIN;

-- Cabut SELECT tabel penuh, lalu izinkan katalog operasional saja.
REVOKE SELECT ON TABLE public.members FROM authenticated;
GRANT SELECT (id, name, active, created_at) ON TABLE public.members TO authenticated;

-- Tarif pengaturan hanya dapat dibaca melalui RPC pemeriksa role.
REVOKE SELECT ON TABLE public.app_settings FROM authenticated;

CREATE OR REPLACE FUNCTION public.get_member_tariffs()
RETURNS TABLE(member_id uuid, special_rate numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := public.current_app_role();
  v_member_id uuid := public.current_member_id();
BEGIN
  IF v_role IN ('owner', 'admin') THEN
    RETURN QUERY
      SELECT m.id, m.special_rate
      FROM public.members AS m
      WHERE m.active = true AND m.special_rate IS NOT NULL;
  ELSIF v_role = 'member' AND v_member_id IS NOT NULL THEN
    RETURN QUERY
      SELECT m.id, m.special_rate
      FROM public.members AS m
      WHERE m.id = v_member_id AND m.active = true AND m.special_rate IS NOT NULL;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_app_settings_for_role()
RETURNS TABLE(regular_rate numeric, bonus_rate numeric, bonus_every integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_app_role() IN ('owner', 'admin', 'member') THEN
    RETURN QUERY
      SELECT s.regular_rate, s.bonus_rate, s.bonus_every
      FROM public.app_settings AS s
      WHERE s.id = true;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_member_special_rate(
  p_member_id uuid,
  p_rate numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.current_app_role() IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Akses ditolak. Hanya Owner yang dapat mengubah tarif khusus.';
  END IF;

  IF p_rate IS NOT NULL AND p_rate < 0 THEN
    RAISE EXCEPTION 'Tarif tidak boleh bernilai negatif.';
  END IF;

  UPDATE public.members
  SET special_rate = p_rate
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Member tidak ditemukan.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_tariffs() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_app_settings_for_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_member_special_rate(uuid, numeric) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_member_tariffs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_app_settings_for_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_member_special_rate(uuid, numeric) TO authenticated;

COMMIT;
