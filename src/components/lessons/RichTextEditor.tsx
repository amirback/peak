"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { Bold, Italic, UnderlineIcon, List, ListOrdered, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight, Link as LinkIcon, ImageIcon, Undo, Redo, Quote, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface Props {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Начните писать..." }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    editorProps: {
      attributes: {
        class: "tiptap",
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  if (!editor) return null;

  const ToolButton = ({ onClick, active, children, title }: { onClick: () => void; active?: boolean; children: React.ReactNode; title?: string }) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "p-1.5 rounded-md transition-colors",
        active ? "bg-blue-100 text-blue-600" : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {children}
    </button>
  );

  const handleImageUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const supabase = createClient();
      const path = `inline/${Date.now()}.${file.name.split(".").pop()}`;
      const { data } = await supabase.storage.from("lesson-materials").upload(path, file);
      if (data) {
        const { data: { publicUrl } } = supabase.storage.from("lesson-materials").getPublicUrl(path);
        editor.chain().focus().setImage({ src: publicUrl }).run();
      }
    };
    input.click();
  };

  const setLink = () => {
    const url = window.prompt("URL ссылки:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b border-slate-100 bg-slate-50">
        <ToolButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Жирный">
          <Bold className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Курсив">
          <Italic className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Подчёркнутый">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolButton>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Заголовок H2">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Заголовок H3">
          <Heading3 className="h-3.5 w-3.5" />
        </ToolButton>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <ToolButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Маркированный список">
          <List className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Нумерованный список">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Цитата">
          <Quote className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive("code")} title="Код">
          <Code className="h-3.5 w-3.5" />
        </ToolButton>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <ToolButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="По левому краю">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="По центру">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="По правому краю">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolButton>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <ToolButton onClick={setLink} active={editor.isActive("link")} title="Вставить ссылку">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={handleImageUpload} title="Вставить изображение">
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolButton>
        <div className="w-px h-5 bg-slate-200 mx-1" />
        <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Отменить">
          <Undo className="h-3.5 w-3.5" />
        </ToolButton>
        <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Повторить">
          <Redo className="h-3.5 w-3.5" />
        </ToolButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
