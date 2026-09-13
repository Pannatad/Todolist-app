-- Apply after 0018. These account-scoped operations update related data atomically.
BEGIN;
CREATE OR REPLACE FUNCTION public.rename_uni_board_class(target_class_id UUID, new_name TEXT)
RETURNS public.uni_board_classes
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  course public.uni_board_classes;
  clean_name TEXT := btrim(new_name);
BEGIN
  IF clean_name IS NULL OR clean_name = '' THEN RAISE EXCEPTION 'Enter a class name.'; END IF;
  SELECT * INTO course FROM public.uni_board_classes
    WHERE id = target_class_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Class not found.'; END IF;
  IF EXISTS (SELECT 1 FROM public.uni_board_classes WHERE user_id = auth.uid()
    AND id <> target_class_id AND name_key = lower(clean_name)) THEN
    RAISE EXCEPTION 'A class with this name already exists.';
  END IF;
  UPDATE public.tasks SET subject = clean_name
    WHERE class_id = target_class_id AND user_id = auth.uid();
  UPDATE public.schedule_items SET category = clean_name,
    title = CASE WHEN left(title, length(course.name) + 1) = course.name || ' '
      THEN clean_name || substr(title, length(course.name) + 1) ELSE title END
    WHERE class_id = target_class_id AND user_id = auth.uid();
  UPDATE public.uni_board_classes SET name = clean_name, name_key = lower(clean_name)
    WHERE id = target_class_id AND user_id = auth.uid() RETURNING * INTO course;
  RETURN course;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_uni_board_class(target_class_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  PERFORM 1 FROM public.uni_board_classes
    WHERE id = target_class_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Class not found.'; END IF;
  DELETE FROM public.tasks WHERE class_id = target_class_id AND user_id = auth.uid();
  DELETE FROM public.schedule_items WHERE class_id = target_class_id AND user_id = auth.uid();
  -- Announcements cascade through their existing class foreign key.
  DELETE FROM public.uni_board_classes WHERE id = target_class_id AND user_id = auth.uid();
END;
$$;
REVOKE ALL ON FUNCTION public.rename_uni_board_class(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_uni_board_class(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rename_uni_board_class(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_uni_board_class(UUID) TO authenticated;
COMMIT;
