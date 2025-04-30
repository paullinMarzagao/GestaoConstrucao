import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatusCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  viewAllLink?: string;
  variant?: "warning" | "success" | "info" | "danger";
}

export default function StatusCard({ title, value, icon, viewAllLink, variant = "info" }: StatusCardProps) {
  const variantStyles = {
    warning: {
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
    },
    success: {
      bgColor: "bg-green-50",
      textColor: "text-green-600",
    },
    info: {
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
    },
    danger: {
      bgColor: "bg-red-50",
      textColor: "text-red-600",
    },
  };

  return (
    <Card>
      <div className="p-5">
        <div className="flex items-center">
          <div className={cn(
            "flex-shrink-0 rounded-md p-3",
            variantStyles[variant].bgColor
          )}>
            <div className={cn(
              "h-6 w-6",
              variantStyles[variant].textColor
            )}>
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">{value}</div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {viewAllLink && (
        <div className="bg-gray-50 px-5 py-3 border-t border-gray-200">
          <div className="text-sm">
            <a href={viewAllLink} className="font-medium text-primary hover:text-primary-dark">
              Ver todos <span className="sr-only">{title}</span>
            </a>
          </div>
        </div>
      )}
    </Card>
  );
}
