import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Toggle } from "@/components/buttons/Toggle";
import { Icon, Icons } from "@/components/Icon";
import { SettingsCard } from "@/components/layout/SettingsCard";
import { MwLink } from "@/components/text/Link";
import { AuthInputBox } from "@/components/text-inputs/AuthInputBox";
import { Divider } from "@/components/utils/Divider";
import { Heading1 } from "@/components/utils/Text";
import { SetupPart } from "@/pages/parts/settings/SetupPart";
import { conf } from "@/setup/config";
import { useAuthStore } from "@/stores/auth";
import { usePreferencesStore } from "@/stores/preferences";

interface ProxyEditProps {
  proxyUrls: string[] | null;
  setProxyUrls: Dispatch<SetStateAction<string[] | null>>;
}

interface BackendEditProps {
  backendUrl: string | null;
  setBackendUrl: Dispatch<SetStateAction<string | null>>;
}

interface FebboxTokenProps {
  febboxToken: string | null;
  setFebboxToken: Dispatch<SetStateAction<string | null>>;
}

function ProxyEdit({ proxyUrls, setProxyUrls }: ProxyEditProps) {
  const proxyTmdb = usePreferencesStore((s) => s.proxyTmdb);
  const setProxyTmdb = usePreferencesStore((s) => s.setProxyTmdb);

  const { t } = useTranslation();
  const add = useCallback(() => {
    setProxyUrls((s) => [...(s ?? []), ""]);
  }, [setProxyUrls]);

  const changeItem = useCallback(
    (index: number, val: string) => {
      setProxyUrls((s) => [
        ...(s ?? []).map((v, i) => {
          if (i !== index) return v;
          return val;
        }),
      ]);
    },
    [setProxyUrls],
  );

  const removeItem = useCallback(
    (index: number) => {
      setProxyUrls((s) => [...(s ?? []).filter((v, i) => i !== index)]);
    },
    [setProxyUrls],
  );

  return (
    <SettingsCard>
      <div className="flex justify-between items-center gap-4">
        <div className="my-3">
          <p className="text-white font-bold mb-3">
            {t("settings.connections.workers.label")}
          </p>
          <p className="max-w-[30rem] font-medium">
            <Trans i18nKey="settings.connections.workers.description">
              <MwLink to="https://docs.undi.rest/proxy/deploy">
                Proxy documentation
              </MwLink>
            </Trans>
          </p>
        </div>
        <div>
          <Toggle
            onClick={() => setProxyUrls((s) => (s === null ? [] : null))}
            enabled={proxyUrls !== null}
          />
        </div>
      </div>
      {proxyUrls !== null ? (
        <>
          <Divider marginClass="my-6 px-8 box-content -mx-8" />
          <p className="text-white font-bold mb-3">
            {t("settings.connections.workers.urlLabel")}
          </p>

          <div className="my-6 space-y-2 max-w-md">
            {(proxyUrls?.length ?? 0) === 0 ? (
              <p>{t("settings.connections.workers.emptyState")}</p>
            ) : null}
            {(proxyUrls ?? []).map((v, i) => (
              <div
                // not the best but we can live with it
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                className="grid grid-cols-[1fr,auto] items-center gap-2"
              >
                <AuthInputBox
                  value={v}
                  onChange={(val) => changeItem(i, val)}
                  placeholder={
                    t("settings.connections.workers.urlPlaceholder") ??
                    undefined
                  }
                />
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="h-full scale-90 hover:scale-100 rounded-full aspect-square bg-authentication-inputBg hover:bg-authentication-inputBgHover flex justify-center items-center transition-transform duration-200 hover:text-white cursor-pointer"
                >
                  <Icon className="text-xl" icon={Icons.X} />
                </button>
              </div>
            ))}
          </div>

          <Button theme="purple" onClick={add}>
            {t("settings.connections.workers.addButton")}
          </Button>
          <div className="flex flex-col p-4 *:py-2 w-full">
            <div className="flex flex-row *:mx-3 w-full justify-between">
              Proxy TMDB:{" "}
              <Toggle
                enabled={proxyTmdb}
                onClick={() => setProxyTmdb(!proxyTmdb)}
              />
            </div>
            <p className="ml-6 border-l-[1px] pl-3 border-search-placeholder">
              Only needed if for some reason you are unable to use TMDB
            </p>
          </div>
        </>
      ) : null}
    </SettingsCard>
  );
}

function BackendEdit({ backendUrl, setBackendUrl }: BackendEditProps) {
  const { t } = useTranslation();
  const user = useAuthStore();
  return (
    <SettingsCard>
      <div className="flex justify-between items-center gap-4">
        <div className="my-3">
          <p className="text-white font-bold mb-3">
            {t("settings.connections.server.label")}
          </p>
          <p className="max-w-[30rem] font-medium">
            <Trans i18nKey="settings.connections.server.description">
              <MwLink to="https://docs.undi.rest/backend/deploy">
                Backend documentation
              </MwLink>
            </Trans>
          </p>
          {user.account && (
            <div>
              <br />
              <p className="max-w-[30rem] font-medium">
                <Trans i18nKey="settings.connections.server.migration.description">
                  <MwLink to="/migration">
                    {t("settings.connections.server.migration.link")}
                  </MwLink>
                </Trans>
              </p>
            </div>
          )}
        </div>
        <div>
          <Toggle
            onClick={() => setBackendUrl((s) => (s === null ? "" : null))}
            enabled={backendUrl !== null}
          />
        </div>
      </div>
      {backendUrl !== null ? (
        <>
          <Divider marginClass="my-6 px-8 box-content -mx-8" />
          <p className="text-white font-bold mb-3">
            {t("settings.connections.server.urlLabel")}
          </p>
          <AuthInputBox
            onChange={setBackendUrl}
            value={backendUrl ?? ""}
            placeholder="https://"
          />
        </>
      ) : null}
    </SettingsCard>
  );
}

function FebboxTokenEdit({ febboxToken, setFebboxToken }: FebboxTokenProps) {
  const { t } = useTranslation();
  const [showVideo, setShowVideo] = useState(false);

  if (conf().ALLOW_FEBBOX_KEY) {
    return (
      <SettingsCard>
        <div className="flex justify-between items-center gap-4">
          <div className="my-3">
            <p className="text-white font-bold mb-3">
              Optional: FED API (Febbox) token
            </p>
            <p className="max-w-[30rem] font-medium">
              <Trans i18nKey="settings.connections.febbox.description">
                Bring your own Febbox account to get the best streaming with 4K
                quality, Dolby Atmos, and the best (fastest) load times!
              </Trans>
            </p>
          </div>
          <div>
            <Toggle
              onClick={() => setFebboxToken((s) => (s === null ? "" : null))}
              enabled={febboxToken !== null}
            />
          </div>
        </div>
        {febboxToken !== null ? (
          <>
            <Divider marginClass="my-6 px-8 box-content -mx-8" />

            <div className="my-3">
              <p className="max-w-[30rem] font-medium">
                <Trans i18nKey="settings.connections.febbox.description">
                  To get your UI token:
                  <br />
                  <div
                    onClick={() => setShowVideo(!showVideo)}
                    className="flex items-center justify-between p-1 px-2 my-2 w-fit border border-type-secondary rounded-lg cursor-pointer text-type-secondary hover:text-white transition-colors duration-200"
                  >
                    <span className="text-sm">
                      {showVideo
                        ? "Hide Video Tutorial"
                        : "Show Video Tutorial"}
                    </span>
                    {showVideo ? (
                      <Icon icon={Icons.CHEVRON_UP} className="pl-1" />
                    ) : (
                      <Icon icon={Icons.CHEVRON_DOWN} className="pl-1" />
                    )}
                  </div>
                  {showVideo && (
                    <>
                      <div className="relative pt-[56.25%] mt-2">
                        <iframe
                          src="https://player.vimeo.com/video/1059834885?h=c3ab398d42&amp;badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479"
                          allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                          className="absolute top-0 left-0 w-full h-full border border-type-secondary rounded-lg bg-black"
                          title="P-Stream FED API Setup Tutorial"
                        />
                      </div>
                      <br />
                    </>
                  )}
                  1. Go to <MwLink url="https://febbox.com">febbox.com</MwLink>{" "}
                  and log in with Google (use a fresh account!)
                  <br />
                  2. Open DevTools or inspect the page
                  <br />
                  3. Go to Application tab → Cookies
                  <br />
                  4. Copy the &quot;ui&quot; cookie.
                  <br />
                  5. Close the tab, but do NOT logout!
                </Trans>
              </p>
              <p className="text-type-danger mt-2">
                (Do not share this token!)
              </p>
            </div>

            <Divider marginClass="my-6 px-8 box-content -mx-8" />
            <p className="text-white font-bold mb-3">
              {t("settings.connections.febbox.tokenLabel", "Token")}
            </p>
            <AuthInputBox
              onChange={(newToken) => {
                setFebboxToken(newToken);
              }}
              value={febboxToken ?? ""}
              placeholder="eyABCdE..."
              passwordToggleable
            />
          </>
        ) : null}
      </SettingsCard>
    );
  }
}

export function ConnectionsPart(
  props: BackendEditProps & ProxyEditProps & FebboxTokenProps,
) {
  const { t } = useTranslation();
  return (
    <div>
      <Heading1 border>{t("settings.connections.title")}</Heading1>
      <div className="space-y-6">
        <SetupPart /> {/* I was wondering what happened to this badddev >:( */}
        <ProxyEdit
          proxyUrls={props.proxyUrls}
          setProxyUrls={props.setProxyUrls}
        />
        <BackendEdit
          backendUrl={props.backendUrl}
          setBackendUrl={props.setBackendUrl}
        />
        <FebboxTokenEdit
          febboxToken={props.febboxToken}
          setFebboxToken={props.setFebboxToken}
        />
      </div>
    </div>
  );
}
