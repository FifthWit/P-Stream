import { motion } from "motion/react";
import { Children, forwardRef, isValidElement } from "react";

interface MediaGridProps {
  children?: React.ReactNode;
}

export const MediaGrid = forwardRef<HTMLDivElement, MediaGridProps>(
  (props, ref) => {
    const animatedChildren = Children.map(props.children, (child) => {
      if (isValidElement(child)) {
        return (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 20, scale: 0.7 },
              show: { opacity: 1, y: 0, scale: 1 },
            }}
          >
            {child}
          </motion.div>
        );
      }
      return child;
    });
    return (
      <motion.div
        className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4"
        ref={ref}
        variants={{
          hidden: { opacity: 0, y: 20 },
          show: {
            opacity: 1,
            y: 0,
            transition: {
              type: "spring",
              stiffness: 350,
              damping: 15,
              mass: 0.4,
            },
          },
        }}
        initial="hidden"
        animate="show"
      >
        {animatedChildren}
      </motion.div>
    );
  },
);
