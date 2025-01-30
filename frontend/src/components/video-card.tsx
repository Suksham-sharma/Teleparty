import Image from "next/image";
interface VideoCardProps {
  title: string;
  description: string;
  thumbnailUrl: string;
}

export function VideoCard({
  title,
  description,
  thumbnailUrl,
}: VideoCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg transition-all duration-300 ease-in-out hover:shadow-lg bg-white">
      <div className="aspect-video overflow-hidden">
        <Image
          className="h-full w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105"
          src={thumbnailUrl || "/placeholder.svg?height=300&width=400"}
          alt={title}
          width={800}
          height={450}
        />
        <div className="absolute inset-0 bg-indigo-600 bg-opacity-40 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-100" />
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6 text-white transform translate-y-full transition-transform duration-300 ease-in-out group-hover:translate-y-0 bg-gradient-to-t from-indigo-900 to-transparent">
        <h2 className="text-xl font-semibold mb-2">{title}</h2>
        <p className="text-sm opacity-90">{description}</p>
      </div>
      <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 transform scale-x-0 transition-transform duration-300 ease-in-out group-hover:scale-x-100" />
    </div>
  );
}
