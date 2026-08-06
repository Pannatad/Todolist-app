import { useState } from 'react';

export const useAIProjectArchitect = () => {
    const [isGenerating, setIsGenerating] = useState(false);

    const generateProjectPlan = async (prompt) => {
        setIsGenerating(true);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock logic to generate relevant tasks based on prompt keywords
        const isWebsite = prompt.toLowerCase().includes('website') || prompt.toLowerCase().includes('app');
        const isMarketing = prompt.toLowerCase().includes('marketing') || prompt.toLowerCase().includes('campaign');

        let tasks = [];

        if (isWebsite) {
            tasks = [
                { title: 'Define Requirements', description: 'List core features and user stories', priority: 'High', columnId: 'c-1' },
                { title: 'Design System', description: 'Choose colors, typography, and components', priority: 'Medium', columnId: 'c-1' },
                { title: 'Setup Environment', description: 'Install dependencies and configure build tools', priority: 'High', columnId: 'c-1' },
                { title: 'Database Schema', description: 'Design data models', priority: 'High', columnId: 'c-1' },
                { title: 'Frontend Implementation', description: 'Build UI components', priority: 'Medium', columnId: 'c-1' }
            ];
        } else if (isMarketing) {
            tasks = [
                { title: 'Market Research', description: 'Analyze competitors and target audience', priority: 'High', columnId: 'c-1' },
                { title: 'Content Strategy', description: 'Plan blog posts and social media content', priority: 'Medium', columnId: 'c-1' },
                { title: 'Ad Creatives', description: 'Design banners and ad copy', priority: 'Medium', columnId: 'c-1' },
                { title: 'Launch Campaign', description: 'Execute the marketing plan', priority: 'High', columnId: 'c-1' }
            ];
        } else {
            // Generic
            tasks = [
                { title: 'Initial Research', description: 'Gather necessary information', priority: 'High', columnId: 'c-1' },
                { title: 'Planning Phase', description: 'Outline steps and resources', priority: 'High', columnId: 'c-1' },
                { title: 'Execution', description: 'Start working on core tasks', priority: 'Medium', columnId: 'c-1' },
                { title: 'Review', description: 'Evaluate results and iterate', priority: 'Low', columnId: 'c-1' }
            ];
        }

        // Assign IDs
        tasks = tasks.map((t, i) => ({ ...t, id: `gen-${Date.now()}-${i}` }));

        const projectStructure = {
            title: prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt,
            description: `AI Generated plan for: ${prompt}`,
            status: 'active',
            columns: [
                { id: 'c-1', title: 'Work tree 1' }
            ],
            tasks: tasks
        };

        setIsGenerating(false);
        return projectStructure;
    };

    return { generateProjectPlan, isGenerating };
};
