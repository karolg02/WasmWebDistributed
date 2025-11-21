import { Paper, Text, UnstyledButton, Container, Title, Modal, Code, Divider } from "@mantine/core"
import { helpList } from "./helpList"
import { useState } from "react";

export const Help = () => {
    const [hovered, setHovered] = useState<number | null>(null);
    const [selectedItem, setSelectedItem] = useState<typeof helpList[0] | null>(null);

    const renderDescription = (description: string) => {
        return description.split('\n').map((line, i) => {
            // Headers
            if (line.startsWith('# ')) {
                return <Title key={i} order={2} mt="lg" mb="md" c="white">{line.substring(2)}</Title>;
            }
            if (line.startsWith('## ')) {
                return <Title key={i} order={3} mt="md" mb="sm" c="violet">{line.substring(3)}</Title>;
            }
            if (line.startsWith('### ')) {
                return <Title key={i} order={4} mt="sm" mb="xs" c="white">{line.substring(4)}</Title>;
            }
            
            // Code blocks
            if (line.startsWith('```')) {
                return <Divider key={i} my="xs" />;
            }
            
            // Lists
            if (line.startsWith('- ') || line.startsWith('* ')) {
                return <Text key={i} pl="md" c="dimmed" size="sm">• {line.substring(2)}</Text>;
            }
            
            // Inline code
            if (line.includes('`') && !line.startsWith('```')) {
                const parts = line.split('`');
                return (
                    <Text key={i} size="sm" c="white" mb="xs">
                        {parts.map((part, j) => 
                            j % 2 === 0 ? part : <Code key={j} style={{ background: 'rgba(121, 80, 242, 0.2)' }}>{part}</Code>
                        )}
                    </Text>
                );
            }
            
            // Regular text
            if (line.trim()) {
                return <Text key={i} size="sm" c="dimmed" mb="xs">{line}</Text>;
            }
            
            return <br key={i} />;
        });
    };

    return (
        <Container size="lg" py="xl">
            <Title
                order={1}
                size="2.5rem"
                mb="xl"
                ta="center"
                style={{
                    background: 'linear-gradient(45deg, #7950f2, #9775fa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}
            >
                Centrum pomocy
            </Title>

            <Paper
                p="xl"
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
                        onClick={() => setSelectedItem(item)}
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

            <Modal
                opened={selectedItem !== null}
                onClose={() => setSelectedItem(null)}
                title={selectedItem?.name}
                size="xl"
                styles={{
                    content: {
                        background: 'rgba(26, 27, 30, 0.95)',
                        backdropFilter: 'blur(20px)',
                    },
                    header: {
                        background: 'transparent',
                    },
                    title: {
                        color: '#7950f2',
                        fontWeight: 700,
                        fontSize: '1.5rem'
                    }
                }}
            >
                {selectedItem && (
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {renderDescription(selectedItem.description)}
                    </div>
                )}
            </Modal>
        </Container>
    );
}