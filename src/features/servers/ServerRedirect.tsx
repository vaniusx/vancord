import { Hash, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import { EmptyState } from "@/components/common/empty-state";
import { useChannels } from "@/features/servers/use-servers";

export function ServerRedirect() {
  const { t } = useTranslation();
  const { serverId } = useParams<{ serverId: string }>();
  const navigate = useNavigate();
  const { data: channels, isLoading } = useChannels(serverId);

  useEffect(() => {
    if (!channels || channels.length === 0) return;
    navigate(`/s/${serverId}/${channels[0].id}`, { replace: true });
  }, [channels, serverId, navigate]);

  if (isLoading || (channels && channels.length > 0)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState
        icon={<Hash className="size-5" />}
        title={t("sidebar.noChannels")}
        description={t("channels.emptyBody")}
      />
    </div>
  );
}
