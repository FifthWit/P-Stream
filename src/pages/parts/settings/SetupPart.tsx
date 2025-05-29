/* eslint-disable no-console */
import classNames from "classnames";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAsync } from "react-use";

import { isExtensionActive } from "@/backend/extension/messaging";
import { singularProxiedFetch } from "@/backend/helpers/fetch";
import { Button } from "@/components/buttons/Button";
import { Icon, Icons } from "@/components/Icon";
import { Loading } from "@/components/layout/Loading";
import { SettingsCard } from "@/components/layout/SettingsCard";
import {
  StatusCircle,
  StatusCircleProps,
} from "@/components/player/internals/StatusCircle";
import { Heading3 } from "@/components/utils/Text";
import { conf } from "@/setup/config";
import { useAuthStore } from "@/stores/auth";

const getRegion = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;
  try {
    const regionData = window.localStorage.getItem("__MW::region");
    if (!regionData) return null;
    const parsed = JSON.parse(regionData);
    return parsed?.state?.region || null;
  } catch {
    return null;
  }
};

const getBaseUrl = async (): Promise<string> => {
  const region = await getRegion();
  switch (region) {
    case "us-east":
      return "https://fed-api-east.pstream.org";
    case "us-west":
      return "https://fed-api-west.pstream.org";
    case "south":
      return "https://fed-api-south.pstream.org";
    case "asia":
      return "https://fed-api-asia.pstream.org";
    case "europe":
      return "https://fed-api-europe.pstream.org";
    case "unknown":
      return "https://fed-api-east.pstream.org";
    default:
      return "";
  }
};

const testUrl = "https://postman-echo.com/get";

const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

export type Status =
  | "success"
  | "unset"
  | "error"
  | "api_down"
  | "invalid_token";

type SetupData = {
  extension: Status;
  proxy: Status;
  defaultProxy: Status;
  febboxTokenTest?: Status;
};

function testProxy(url: string) {
  return new Promise<void>((resolve, reject) => {
    setTimeout(() => reject(new Error("Timed out!")), 3000);
    singularProxiedFetch(url, testUrl, {})
      .then((res) => {
        if (res.url !== testUrl) return reject(new Error("Not a proxy"));
        resolve();
      })
      .catch(reject);
  });
}

export async function testFebboxToken(
  febboxToken: string | null,
): Promise<Status> {
  const BASE_URL = await getBaseUrl();
  const febboxApiTestUrl = `${BASE_URL}/movie/tt13654226`;

  if (!febboxToken) {
    return "unset";
  }

  let attempts = 0;
  const maxAttempts = 2;

  while (attempts < maxAttempts) {
    console.log(
      `Attempt ${attempts + 1} of ${maxAttempts} to check Febbox token`,
    );
    try {
      const response = await fetch(febboxApiTestUrl, {
        headers: {
          "ui-token": febboxToken,
        },
      });

      if (!response.ok) {
        console.error("Febbox API test failed with status:", response.status);
        if (response.status === 503 || response.status === 502) {
          return "api_down";
        }
        attempts += 1;
        if (attempts === maxAttempts) {
          console.log("Max attempts reached, returning error");
          return "invalid_token";
        }
        console.log("Retrying after failed response...");
        await sleep(3000);
        continue;
      }

      const data = (await response.json()) as any;
      if (!data || !data.streams) {
        console.error("Invalid response format from Febbox API:", data);
        attempts += 1;
        if (attempts === maxAttempts) {
          console.log("Max attempts reached, returning error");
          return "invalid_token";
        }
        console.log("Retrying after invalid response format...");
        await sleep(3000);
        continue;
      }

      const isVIPLink = Object.values(data.streams).some((link: any) => {
        if (typeof link === "string") {
          return link.toLowerCase().includes("vip");
        }
        return false;
      });

      if (isVIPLink) {
        console.log("VIP link found, returning success");
        return "success";
      }

      console.log("No VIP link found in attempt", attempts + 1);
      attempts += 1;
      if (attempts === maxAttempts) {
        console.log("Max attempts reached, returning error");
        return "invalid_token";
      }
      console.log("Retrying after no VIP link found...");
      await sleep(3000);
    } catch (error: any) {
      console.error("Error testing Febbox token:", error);
      attempts += 1;
      if (attempts === maxAttempts) {
        console.log("Max attempts reached, returning error");
        return "api_down";
      }
      console.log("Retrying after error...");
      await sleep(3000);
    }
  }

  console.log("All attempts exhausted, returning error");
  return "api_down";
}

function useIsSetup() {
  const proxyUrls = useAuthStore((s) => s.proxySet);
  const febboxToken = useAuthStore((s) => s.febboxToken);
  const { loading, value } = useAsync(async (): Promise<SetupData> => {
    const extensionStatus: Status = (await isExtensionActive())
      ? "success"
      : "unset";
    let proxyStatus: Status = "unset";
    if (proxyUrls && proxyUrls.length > 0) {
      try {
        await testProxy(proxyUrls[0]);
        proxyStatus = "success";
      } catch {
        proxyStatus = "error";
      }
    }

    const febboxTokenStatus: Status = await testFebboxToken(febboxToken);

    return {
      extension: extensionStatus,
      proxy: proxyStatus,
      defaultProxy: "success",
      ...(conf().ALLOW_FEBBOX_KEY && {
        febboxTokenTest: febboxTokenStatus,
      }),
    };
  }, [proxyUrls, febboxToken]);

  let globalState: Status = "unset";
  if (
    value?.extension === "success" ||
    value?.proxy === "success" ||
    value?.febboxTokenTest === "success"
  )
    globalState = "success";
  if (
    value?.proxy === "error" ||
    value?.extension === "error" ||
    value?.febboxTokenTest === "error"
  )
    globalState = "error";

  return {
    setupStates: value,
    globalState,
    loading,
  };
}

function SetupCheckList(props: {
  status: Status;
  grey?: boolean;
  highlight?: boolean;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const statusMap: Record<Status, StatusCircleProps["type"]> = {
    error: "error",
    success: "success",
    unset: "noresult",
    api_down: "error",
    invalid_token: "error",
  };

  return (
    <div className="flex items-start text-type-dimmed my-4">
      <StatusCircle
        type={statusMap[props.status]}
        className={classNames({
          "!text-video-scraping-noresult !bg-video-scraping-noresult opacity-50":
            props.grey,
          "scale-90 mr-3": true,
        })}
      />
      <div>
        <p
          className={classNames({
            "!text-white": props.grey && props.highlight,
            "!text-type-dimmed opacity-75": props.grey && !props.highlight,
            "text-type-danger": props.status === "error",
            "text-white": props.status === "success",
          })}
        >
          {props.children}
        </p>
        {props.status === "error" ? (
          <p className="max-w-96">
            {t("settings.connections.setup.itemError")}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function SetupPart() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loading, setupStates, globalState } = useIsSetup();
  if (loading || !setupStates) {
    return (
      <SettingsCard>
        <div className="flex py-6 items-center justify-center">
          <Loading />
        </div>
      </SettingsCard>
    );
  }

  const textLookupMap: Record<
    Status,
    { title: string; desc: string; button: string }
  > = {
    error: {
      title: "settings.connections.setup.errorStatus.title",
      desc: "settings.connections.setup.errorStatus.description",
      button: "settings.connections.setup.redoSetup",
    },
    success: {
      title: "settings.connections.setup.successStatus.title",
      desc: "settings.connections.setup.successStatus.description",
      button: "settings.connections.setup.redoSetup",
    },
    unset: {
      title: "settings.connections.setup.unsetStatus.title",
      desc: "settings.connections.setup.unsetStatus.description",
      button: "settings.connections.setup.doSetup",
    },
    api_down: {
      title: "settings.connections.setup.errorStatus.title",
      desc: "settings.connections.setup.errorStatus.description",
      button: "settings.connections.setup.redoSetup",
    },
    invalid_token: {
      title: "settings.connections.setup.errorStatus.title",
      desc: "settings.connections.setup.errorStatus.description",
      button: "settings.connections.setup.redoSetup",
    },
  };

  return (
    <SettingsCard>
      <div className="flex flex-col md:flex-row items-start gap-4">
        <div>
          <div
            className={classNames({
              "rounded-full h-12 w-12 flex bg-opacity-15 justify-center items-center":
                true,
              "text-type-success bg-type-success": globalState === "success",
              "text-type-danger bg-type-danger":
                globalState === "error" || globalState === "unset",
            })}
          >
            <Icon
              icon={globalState === "success" ? Icons.CHECKMARK : Icons.X}
              className="text-xl"
            />
          </div>
        </div>
        <div className="flex-1">
          <Heading3 className="!mb-3">
            {t(textLookupMap[globalState].title)}
          </Heading3>
          <p className="max-w-[20rem] font-medium mb-6">
            {t(textLookupMap[globalState].desc)}
          </p>
          <SetupCheckList status={setupStates.extension}>
            {t("settings.connections.setup.items.extension")}
          </SetupCheckList>
          <SetupCheckList status={setupStates.proxy}>
            {t("settings.connections.setup.items.proxy")}
          </SetupCheckList>
          <SetupCheckList
            grey
            highlight={globalState === "unset"}
            status={setupStates.defaultProxy}
          >
            {t("settings.connections.setup.items.default")}
          </SetupCheckList>
          {conf().ALLOW_FEBBOX_KEY && (
            <SetupCheckList status={setupStates.febboxTokenTest || "unset"}>
              Febbox UI token
            </SetupCheckList>
          )}
        </div>
        <div className="md:mt-5">
          <Button theme="purple" onClick={() => navigate("/onboarding")}>
            {t(textLookupMap[globalState].button)}
          </Button>
        </div>
      </div>
    </SettingsCard>
  );
}
