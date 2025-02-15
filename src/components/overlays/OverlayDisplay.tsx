import classNames from "classnames";
import FocusTrap from "focus-trap-react";
import { AnimatePresence, motion } from "motion/react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import {
  useInternalOverlayRouter,
  useRouterAnchorUpdate,
} from "@/hooks/useOverlayRouter";
import { TurnstileProvider, getTurnstile } from "@/stores/turnstile";

export interface OverlayProps {
  id: string;
  children?: ReactNode;
  darken?: boolean;
}

function TurnstileInteractive() {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  useEffect(() => {
    getTurnstile();
  }, []);

  // this may not rerender with different dom structure, must be exactly the same always
  return (
    <div
      className={classNames(
        "absolute w-full max-w-[43em] max-h-full p-5 md:p-10 rounded-lg bg-dropdown-altBackground select-none z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transform overflow-auto",
        show ? "" : "hidden",
      )}
    >
      <div className="w-full h-full grid lg:grid-cols-[1fr,auto] gap-6 md:gap-7 items-center">
        <div className="text-left">
          <h2 className="text-type-emphasis font-bold text-lg md:text-xl mb-4 md:mb-6">
            {t("player.turnstile.title")}
          </h2>
          <p className="text-type-emphasis">
            {t("player.turnstile.description")}
          </p>
        </div>
        <TurnstileProvider
          isInPopout
          onUpdateShow={(shouldShow) => setShow(shouldShow)}
        />
      </div>
    </div>
  );
}

export function OverlayDisplay(props: { children: ReactNode }) {
  const router = useInternalOverlayRouter("hello world :)");
  const refRouter = useRef(router);

  // close router on first mount, we dont want persist routes for overlays
  useEffect(() => {
    const r = refRouter.current;
    r.close();
    return () => {
      r.close();
    };
  }, []);
  return (
    <div className="popout-location">
      <TurnstileInteractive />
      {props.children}
    </div>
  );
}

export function OverlayPortal(props: {
  children?: ReactNode;
  darken?: boolean;
  show?: boolean;
  close?: () => void;
}) {
  const [portalElement, setPortalElement] = useState<Element | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const close = props.close;

  useEffect(() => {
    const element = ref.current?.closest(".popout-location");
    setPortalElement(element ?? document.body);
  }, []);

  return (
    <div ref={ref}>
      {portalElement
        ? createPortal(
            <AnimatePresence>
              {props.show && (
                <FocusTrap>
                  <motion.div
                    className="popout-wrapper fixed overflow-hidden pointer-events-auto inset-0 z-[999] select-none"
                    style={{ transformOrigin: "bottom right" }}
                    initial={{ opacity: 0, y: 20, x: 10 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0.5, y: 20, x: 20, scale: 0.6 }}
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 15,
                      mass: 0.5,
                    }}
                  >
                    <motion.div
                      onClick={close}
                      className={classNames({
                        "absolute inset-0": true,
                        "bg-black opacity-90": props.darken,
                      })}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.2 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 15,
                        mass: 0.4,
                      }}
                    />
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      initial={{ y: 30, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 30, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 350,
                        damping: 15,
                        mass: 0.4,
                      }}
                    >
                      {/* a tabbable index that does nothing - used so focus trap doesn't error when nothing is rendered yet */}
                      <div
                        tabIndex={1}
                        className="focus:ring-0 focus:outline-none opacity-0"
                      />
                      {props.children}
                    </motion.div>
                  </motion.div>
                </FocusTrap>
              )}
            </AnimatePresence>,
            portalElement,
          )
        : null}
    </div>
  );
}

export function Overlay(props: OverlayProps) {
  const router = useInternalOverlayRouter(props.id);
  const realClose = router.close;

  // listen for anchor updates
  useRouterAnchorUpdate(props.id);

  const close = useCallback(() => {
    realClose();
  }, [realClose]);

  return (
    <OverlayPortal
      close={close}
      show={router.isOverlayActive()}
      darken={props.darken}
    >
      {props.children}
    </OverlayPortal>
  );
}
