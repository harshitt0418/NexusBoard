"use client";
import React, { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";

export const ContainerScroll = ({ titleComponent, children }) => {
    const containerRef = useRef(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    });
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => {
            window.removeEventListener("resize", checkMobile);
        };
    }, []);

    const scaleDimensions = () => {
        return isMobile ? [0.7, 0.9] : [1.05, 1];
    };

    const rotate = useTransform(scrollYProgress, [0, 1], [20, 0]);
    const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
    const translate = useTransform(scrollYProgress, [0, 1], [0, -100]);

    return (
        <div
            style={{
                height: isMobile ? "40rem" : "55rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                padding: isMobile ? "8px" : "20px",
            }}
            ref={containerRef}
        >
            <div
                style={{
                    paddingTop: isMobile ? "20px" : "60px",
                    paddingBottom: isMobile ? "20px" : "60px",
                    width: "100%",
                    position: "relative",
                    perspective: "1000px",
                }}
            >
                <Header translate={translate} titleComponent={titleComponent} />
                <Card rotate={rotate} translate={translate} scale={scale}>
                    {children}
                </Card>
            </div>
        </div>
    );
};

export const Header = ({ translate, titleComponent }) => {
    return (
        <motion.div
            style={{ translateY: translate, textAlign: "center", maxWidth: "800px", margin: "0 auto" }}
        >
            {titleComponent}
        </motion.div>
    );
};

export const Card = ({ rotate, scale, children }) => {
    return (
        <motion.div
            style={{
                rotateX: rotate,
                scale,
                boxShadow:
                    "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
                marginTop: "-48px",
                maxWidth: "900px",
                margin: "-48px auto 0",
                height: "500px",
                width: "100%",
                border: "4px solid #6C6C6C",
                padding: "8px",
                background: "#1a1a2e",
                borderRadius: "30px",
            }}
        >
            <div
                style={{
                    height: "100%",
                    width: "100%",
                    overflow: "hidden",
                    borderRadius: "16px",
                    background: "#16213e",
                }}
            >
                {children}
            </div>
        </motion.div>
    );
};
