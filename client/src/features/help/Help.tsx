import { Paper, Text, UnstyledButton } from "@mantine/core"
import { helpList } from "./helpList"
import { useState } from "react";

export const Help = () => {
    const [hovered, setHovered] = useState<number | null>(null);

    return (
        <Paper
            p="xl"
            m='xl'
            radius="xl"
            style={{
                background: 'rgba(26, 27, 30, 0.6)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
        >
            {helpList.map((item, index) => (
                <UnstyledButton
                    key={index}
                    onMouseEnter={() => setHovered(index)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                        cursor: 'pointer',
                        background: hovered === index ? 'rgba(121, 80, 242, 0.2)' : 'rgba(26, 27, 30, 0.6)',
                        backdropFilter: 'blur(20px)',
                        border: hovered === index ? '1px solid rgba(121, 80, 242, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        transition: 'all 0.4s ease',
                        transform: hovered === index ? 'translateY(-10px) scale(1.02)' : 'none',
                        boxShadow: hovered === index ? '0 10px 30px rgba(121, 80, 242, 0.3)' : 'none',
                        display: 'block',
                        width: '100%',
                        marginBottom: '16px'
                    }}
                >
                    <Text
                        size="lg"
                        p="lg"
                        c={hovered === index ? '#7950f2' : 'white'}
                        fw={hovered === index ? 600 : 400}
                        style={{
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {item.name}
                    </Text>
                </UnstyledButton>
            ))}
        </Paper>
    );
}