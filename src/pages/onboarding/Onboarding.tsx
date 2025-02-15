import { useState } from "react";
import { Trans, useTranslation } from "react-i18next";

import { Button } from "@/components/buttons/Button";
import { Toggle } from "@/components/buttons/Toggle";
import { Icon, Icons } from "@/components/Icon";
import { SettingsCard } from "@/components/layout/SettingsCard";
import { Stepper } from "@/components/layout/Stepper";
import { BiggerCenterContainer } from "@/components/layout/ThinContainer";
import { VerticalLine } from "@/components/layout/VerticalLine";
import { Modal, ModalCard, useModal } from "@/components/overlays/Modal";
import { MwLink } from "@/components/text/Link";
import { AuthInputBox } from "@/components/text-inputs/AuthInputBox";
import { Divider } from "@/components/utils/Divider";
import { Heading1, Heading2, Paragraph } from "@/components/utils/Text";
import { MinimalPageLayout } from "@/pages/layouts/MinimalPageLayout";
import {
  useNavigateOnboarding,
  useRedirectBack,
} from "@/pages/onboarding/onboardingHooks";
import {
  Card,
  CardContent,
  Link,
  MiniCardContent,
} from "@/pages/onboarding/utils";
import { PageTitle } from "@/pages/parts/util/PageTitle";
import { useAuthStore } from "@/stores/auth";
import { getProxyUrls } from "@/utils/proxyUrls";

import { PopupModal } from "../parts/home/PopupModal";

export function OptionalDropdown() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const febboxToken = useAuthStore((s) => s.febboxToken);
  const setFebboxToken = useAuthStore((s) => s.setFebboxToken);

  return (
    <div className="mt-12">
      <SettingsCard>
        <div className="flex justify-between items-center gap-4">
          <div className="my-3">
            <p className="text-white font-bold mb-3">
              Optional: FED API (Febbox) UI token
            </p>
            <p className="max-w-[30rem] font-medium">
              <Trans i18nKey="settings.connections.febbox.description">
                Bringing your own UI token allows you to get faster 4K streams.
                We only have a limited number of tokens, so bringing your own
                helps speed your streams when traffic is high.
              </Trans>
            </p>
          </div>
          <div>
            <Toggle
              onClick={() => setIsExpanded(!isExpanded)}
              enabled={isExpanded}
            />
          </div>
        </div>
        {isExpanded ? (
          <>
            <Divider marginClass="my-6 px-8 box-content -mx-8" />

            <div className="my-3">
              <p className="max-w-[30rem] font-medium">
                <Trans i18nKey="settings.connections.febbox.description">
                  To get your UI token:
                  <br />
                  1. Go to <MwLink to="https://febbox.com">
                    febbox.com
                  </MwLink>{" "}
                  and log in with Google
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
              <p className="text-xs mt-2">
                (This is not a sensitive login cookie or account token)
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
            />
          </>
        ) : null}
      </SettingsCard>
    </div>
  );
}
export function OnboardingPage() {
  const navigate = useNavigateOnboarding();
  const skipModal = useModal("skip");
  const { completeAndRedirect } = useRedirectBack();
  const { t } = useTranslation();
  const noProxies = getProxyUrls().length === 0;

  const isSafari =
    typeof navigator !== "undefined" &&
    /Safari/.test(navigator.userAgent) &&
    !/Chrome/.test(navigator.userAgent) &&
    !/Edg/.test(navigator.userAgent);

  const [showModal, setShowModal] = useState(false);

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <MinimalPageLayout>
      <PageTitle subpage k="global.pages.onboarding" />
      <Modal id={skipModal.id}>
        <ModalCard>
          <Heading1 className="!mt-0 !mb-4 !text-2xl">
            {t("onboarding.defaultConfirm.title")}
          </Heading1>
          <Paragraph className="!mt-1 !mb-12">
            {t("onboarding.defaultConfirm.description")}
          </Paragraph>
          <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-between">
            <Button theme="secondary" onClick={skipModal.hide}>
              {t("onboarding.defaultConfirm.cancel")}
            </Button>
            <Button theme="purple" onClick={() => completeAndRedirect()}>
              {t("onboarding.defaultConfirm.confirm")}
            </Button>
          </div>
        </ModalCard>
      </Modal>
      {showModal && (
        <PopupModal
          styles="max-w-2xl" // max-w-md for short max-w-2xl long
          title="Understanding a setup"
          message={
            <div>
              <p>
                P-Stream doesn’t host videos. It relies on third-party websites
                for content, so you need to choose how it connects to those
                sites.
                <br />
                <br />
                <strong>Your Options:</strong>
                <br />
                <strong>1. Extension (Recommended)</strong>
                <br />
                The extension gives you access to the most sources. It acts as a
                local proxy and can handle sites that need special cookies or
                headers to load.
                <br />
                <br />
                <strong>2. Proxy</strong>
                <br />
                The proxy scrapes media from other websites. It bypasses browser
                restrictions (like CORS) to allow scraping.
                <br />
                <br />
                <strong>3. Default Setup</strong>
                <br />
                Uses P-Stream’s built-in proxy. It’s the easiest option but
                might be slower due to shared bandwidth.
                <br />
                <br />
                <strong>Optional FED API (Febbox) UI token</strong>
                <br />
                Bringing your own UI token allows you to get faster 4K streams.
                We only have a limited number of tokens, so bringing your own
                helps speed your streams when traffic is high.
                <br />
                <br />
                If you have more questions on how this works, feel free to ask
                on the{" "}
                <a
                  href="https://discord.com/invite/7z6znYgrTG"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-type-link"
                >
                  P-Stream Discord
                </a>{" "}
                server!
              </p>
            </div>
          }
          onClose={handleCloseModal}
        />
      )}
      <BiggerCenterContainer>
        <Stepper steps={2} current={1} className="mb-12" />
        <Heading2 className="!mt-0 !text-3xl">
          {t("onboarding.start.title")}
        </Heading2>
        <Paragraph className="max-w-[360px]">
          {t("onboarding.start.explainer")}
          <div
            className="pt-4 flex cursor-pointer items-center text-type-link"
            onClick={() => setShowModal(true)}
          >
            <p>More info</p>
            <Icon className="pl-2" icon={Icons.CIRCLE_QUESTION} />
          </div>
        </Paragraph>

        {/* Desktop Cards */}
        <div className="hidden md:flex w-full flex-col md:flex-row gap-3 pb-6">
          <Card
            onClick={() => navigate("/onboarding/extension")}
            className="md:w-1/3 md:h-full"
          >
            <CardContent
              colorClass="!text-onboarding-best"
              title={t("onboarding.start.options.extension.title")}
              subtitle={t("onboarding.start.options.extension.quality")}
              description={t("onboarding.start.options.extension.description")}
            >
              <Link className="!text-onboarding-best">
                {t("onboarding.start.options.extension.action")}
              </Link>
            </CardContent>
          </Card>
          <div className="hidden md:grid grid-rows-[1fr,auto,1fr] justify-center gap-4">
            <VerticalLine className="items-end" />
            <span className="text-xs uppercase font-bold">
              {t("onboarding.start.options.or")}
            </span>
            <VerticalLine />
          </div>
          <Card
            onClick={() => navigate("/onboarding/proxy")}
            className="md:w-1/3"
          >
            <CardContent
              colorClass="!text-onboarding-good"
              title={t("onboarding.start.options.proxy.title")}
              subtitle={t("onboarding.start.options.proxy.quality")}
              description={t("onboarding.start.options.proxy.description")}
            >
              <Link>{t("onboarding.start.options.proxy.action")}</Link>
            </CardContent>
          </Card>
          {noProxies ? null : (
            <>
              <div className="hidden md:grid grid-rows-[1fr,auto,1fr] justify-center gap-4">
                <VerticalLine className="items-end" />
                <span className="text-xs uppercase font-bold">
                  {t("onboarding.start.options.or")}
                </span>
                <VerticalLine />
              </div>
              <Card
                onClick={
                  isSafari
                    ? () => completeAndRedirect() // Skip modal on Safari
                    : skipModal.show // Show modal on other browsers
                }
                className="md:w-1/3"
              >
                <CardContent
                  colorClass="!text-onboarding-bad"
                  title={t("onboarding.defaultConfirm.confirm")}
                  subtitle=""
                  description={t("onboarding.defaultConfirm.description")}
                >
                  <Trans i18nKey="onboarding.start.options.default.text" />
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden flex w-full flex-col md:flex-row gap-3 pb-6">
          <Card
            onClick={() => navigate("/onboarding/extension")}
            className="md:w-1/3 md:h-full"
          >
            <MiniCardContent
              colorClass="!text-onboarding-best"
              title={t("onboarding.start.options.extension.title")}
              subtitle={t("onboarding.start.options.extension.quality")}
              description={t("onboarding.start.options.extension.description")}
            />
          </Card>
          <Card
            onClick={() => navigate("/onboarding/proxy")}
            className="md:w-1/3"
          >
            <MiniCardContent
              colorClass="!text-onboarding-good"
              title={t("onboarding.start.options.proxy.title")}
              subtitle={t("onboarding.start.options.proxy.quality")}
              description={t("onboarding.start.options.proxy.description")}
            />
          </Card>
          {noProxies ? null : (
            <Card
              onClick={
                isSafari
                  ? () => completeAndRedirect() // Skip modal on Safari
                  : skipModal.show // Show modal on other browsers
              }
              className="md:w-1/3"
            >
              <MiniCardContent
                colorClass="!text-onboarding-bad"
                title={t("onboarding.defaultConfirm.confirm")}
                subtitle=""
                description={t("onboarding.defaultConfirm.description")}
              />
            </Card>
          )}
        </div>

        <OptionalDropdown />
      </BiggerCenterContainer>
    </MinimalPageLayout>
  );
}
