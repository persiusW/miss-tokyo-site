"use client";

import { useRef, useState, KeyboardEvent } from "react";

interface TagInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export function TagInput({ value, onChange, placeholder }: TagInputProps) {
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (raw: string) => {
        const tag = raw.trim();
        if (!tag || value.includes(tag)) return;
        onChange([...value, tag]);
    };

    const removeTag = (index: number) => {
        onChange(value.filter((_, i) => i !== index));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(inputValue);
            setInputValue("");
        } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
            removeTag(value.length - 1);
        }
    };

    const handleBlur = () => {
        if (inputValue.trim()) {
            addTag(inputValue);
            setInputValue("");
        }
    };

    return (
        <div
            className="flex flex-wrap items-center gap-1.5 min-h-[38px] w-full border-b border-neutral-300 bg-transparent py-1.5 focus-within:border-black transition-colors cursor-text"
            onClick={() => inputRef.current?.focus()}
        >
            {value.map((tag, i) => (
                <span
                    key={`${tag}-${i}`}
                    className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-700 text-[11px] font-medium px-2 py-0.5 rounded-sm tracking-wide"
                >
                    {tag}
                    <button
                        type="button"
                        aria-label={`Remove ${tag}`}
                        onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                        className="text-neutral-400 hover:text-neutral-900 transition-colors leading-none ml-0.5"
                    >
                        ×
                    </button>
                </span>
            ))}

            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                placeholder={value.length === 0 ? placeholder : ""}
                className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm text-neutral-800 placeholder:text-neutral-400 py-0.5"
            />
        </div>
    );
}
