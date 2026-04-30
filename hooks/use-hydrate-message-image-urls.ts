import { useChatStore } from "@/store/chatStore";
import { createSignedUrlsForChatImages, parseImageIdCsv } from "@/utils/chat/chat-images";
import { supabase } from "@/utils/shared/supabase";
import { useEffect, useMemo, useState } from "react";

export type UseHydrateMessageImageUrlsArgs = {
  messageId: string;
  userId: string;
  imageId: string | string[] | null | undefined;
  /** Already resolved (e.g. just after send); skips network. */
  prefetchedUrls: string[] | undefined;
};

export function useHydrateMessageImageUrls({
  messageId,
  userId,
  imageId,
  prefetchedUrls,
}: UseHydrateMessageImageUrlsArgs): { displayUrls: string[]; showLoadingGhost: boolean } {
  const filenames = useMemo(() => parseImageIdCsv(imageId ?? null), [imageId]);
  const hasIds = filenames.length > 0;

  const [fetchedUrls, setFetchedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const prefetchKey = prefetchedUrls && prefetchedUrls.length > 0 ? prefetchedUrls.join("\0") : "";

  useEffect(() => {
    if (prefetchKey) setLoading(false);
  }, [prefetchKey]);

  useEffect(() => {
    setFetchedUrls([]);
  }, [imageId, messageId]);

  useEffect(() => {
    if (!hasIds || !userId) return;
    if (prefetchKey) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const ids = parseImageIdCsv(imageId ?? null);
      const { urls, error } = await createSignedUrlsForChatImages(supabase, userId, ids);
      if (cancelled) return;
      setLoading(false);
      if (error || urls.length === 0) return;
      setFetchedUrls(urls);
      useChatStore.getState().patchMessage(messageId, { imageUrls: urls });
    })();

    return () => {
      cancelled = true;
    };
  }, [hasIds, userId, messageId, imageId, prefetchKey]);

  const displayUrls =
    prefetchKey.length > 0 ? (prefetchedUrls as string[]) : fetchedUrls;
  const showLoadingGhost = hasIds && displayUrls.length === 0 && loading;

  return { displayUrls, showLoadingGhost };
}
