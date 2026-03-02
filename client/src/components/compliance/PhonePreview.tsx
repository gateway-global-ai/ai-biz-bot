import { cn } from "@/lib/utils";

export interface LinkCard {
  title?: string;
  imageSrc?: string;
  items?: Array<{ label: string; value?: string }>;
  cta?: string;
}

export interface PhonePreviewProps {
  messages: string[];
  senderName?: string;
  showLinkCard?: boolean;
  linkCardContent?: LinkCard;
}

export function PhonePreview({
  messages,
  senderName = "Your Company",
  showLinkCard = false,
  linkCardContent,
}: PhonePreviewProps) {
  return (
    <div className="flex justify-center">
      <div className="relative w-[280px] rounded-[2.5rem] border-[10px] border-neutral-800 bg-neutral-900 p-3 shadow-xl">
        <div className="h-[32px] flex items-center justify-center">
          <div className="h-2 w-12 rounded-full bg-neutral-700" />
        </div>
        <div className="rounded-t-2xl bg-neutral-100 px-3 py-2 text-center text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
          {senderName}
        </div>
        <div className="mt-2 space-y-2 overflow-hidden rounded-b-2xl bg-neutral-100 p-2 dark:bg-neutral-800">
          {messages.map((msg, i) => (
            <div key={i} className="flex justify-end">
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-left text-sm",
                  "bg-primary text-primary-foreground",
                  "rounded-br-md"
                )}
              >
                {msg}
              </div>
            </div>
          ))}
          {showLinkCard && linkCardContent && (
            <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900">
              {linkCardContent.imageSrc && (
                <img
                  src={linkCardContent.imageSrc}
                  alt=""
                  className="h-28 w-full object-cover"
                />
              )}
              {linkCardContent.title && (
                <div className="border-b border-neutral-100 px-3 py-2 text-xs font-semibold dark:border-neutral-800">
                  {linkCardContent.title}
                </div>
              )}
              {linkCardContent.items && linkCardContent.items.length > 0 && (
                <ul className="divide-y divide-neutral-100 px-3 py-2 text-xs dark:divide-neutral-800">
                  {linkCardContent.items.map((item, j) => (
                    <li key={j} className="py-1.5">
                      <span className="font-medium">{item.label}</span>
                      {item.value != null && (
                        <span className="text-muted-foreground"> · {item.value}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {linkCardContent.cta && (
                <div className="border-t border-neutral-100 px-3 py-2 dark:border-neutral-800">
                  <span className="text-xs font-medium text-primary">
                    {linkCardContent.cta}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
