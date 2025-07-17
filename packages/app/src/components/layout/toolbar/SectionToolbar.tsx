import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Image, LetterText, Shuffle, SquarePen } from "lucide-react";
import { useState } from "react";
import { AttachButton, SectionOptionsButton, SubmitButton } from "./buttons";
// import { useFileUpload } from "./useFileUpload";

type Tab = "edit" | "variants" | "assets" | "text";

const placeholderByTab: Record<Tab, string> = {
  edit: "Ask for quick changes...",
  variants: "Create section variants...",
  assets: "Ask for asset changes...",
  text: "Ask for copy changes...",
};

export function SectionToolbar({
  submitting,
  autoFocus,
  minRows,
  maxRows,
  onDeleteSection,
}: {
  // initialValue?: MessagePart.AnyUser[];
  submitting: boolean;
  autoFocus?: boolean;
  minRows?: number;
  maxRows?: number;
  onDeleteSection: () => void;
  // onSubmit(parts: MessagePart.AnyUser[]): unknown;
}) {
  const [tab, setTab] = useState<Tab>("edit");
  const [value, setValue] = useState(
    ""
    // initialValue
    //   ?.filter((p) => p.type === "text")
    //   .map((p) => p.text)
    //   .join("\n\n") ?? ""
  );
  // const uploads =
  //   useFileUpload();
  // initialValue
  //   ?.filter((p) => p.type === "file")
  //   .map((p) => ({
  //     ...p,
  //     id: Math.random().toString(36).substring(2, 15),
  //     status: "uploaded",
  //   }))

  const handleSubmit = async () => {
    // const parts: MessagePart.AnyUser[] = [];
    // if (!!value) {
    //   parts.push({ type: "text", text: value });
    // }
    // parts.push(
    //   ...uploads.files.map(({ id, status, ...file }): MessagePart.File => file)
    // );
    // if (!parts.length) return;
    // try {
    //   setValue("");
    //   uploads.set([]);
    //   await onSubmit(parts);
    // } catch {
    //   setValue(value);
    //   uploads.set(uploads.files);
    // }
  };

  return (
    <Card className="py-1 px-2 transition-all border border-input focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-4">
      <CardContent className="flex items-center p-0">
        <AttachButton
          disabled={submitting}
          onClick={() => alert("todo")}
          // onClick={uploads.select}
        />
        <Textarea
          value={value}
          autoFocus={autoFocus}
          minRows={minRows}
          maxRows={maxRows}
          placeholder={placeholderByTab[tab]}
          onChange={(e) => setValue(e.target.value)}
          className="text-lg border-none shadow-none bg-transparent focus:ring-0 focus-visible:ring-0 flex-1 px-0"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        {!!value ? (
          <SubmitButton
            disabled={submitting /*|| uploads.isUploading*/ || !value}
            loading={submitting /*|| uploads.isUploading*/}
            onClick={handleSubmit}
          />
        ) : (
          <>
            <Separator
              orientation="vertical"
              className="self-stretch mr-[2px]"
            />
            {/* <Button size="icon" variant="ghost" className="rounded-full">
              <SquarePen />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full">
              <Shuffle />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full">
              <Image />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-full">
              <LetterText />
            </Button> */}
            <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)}>
              <TabsList>
                <TabsTrigger value="edit">
                  <SquarePen />
                </TabsTrigger>
                <TabsTrigger value="variants">
                  <Shuffle />
                </TabsTrigger>
                <TabsTrigger value="assets">
                  <Image />
                </TabsTrigger>
                <TabsTrigger value="text">
                  <LetterText />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <SectionOptionsButton
              onDelete={onDeleteSection}
              disabled={submitting}
            />
          </>
        )}
        {/* {uploads.input}
        {uploads.files.length > 0 && (
          <div className="flex flex-wrap gap-2 ml-2">
            {uploads.files.map((f) => (
              <FilePreview
                key={f.id}
                loading={f.status === "uploading"}
                file={f}
                onRemove={() => uploads.remove(f.id)}
              />
            ))}
          </div>
        )} */}
      </CardContent>
    </Card>
  );
}
