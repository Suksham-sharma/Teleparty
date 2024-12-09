import { EnhancedChannel } from "./components/details";
import Navbar from "../_components/navbar";
import { cookies } from "next/headers";
import { getChannelForUser } from "@/services/api";

function getChannelData() {
  // This is a mock function. In a real application, you would fetch this data from your API or database.
  const channel = {
    name: "TechEnthusiast",
    description: "Exploring the latest in technology and gadgets!",
    slug: "tech-enthusiast",
    avatarUrl: "/placeholder.svg",
    joinCode: "TECH123",
    bannerUrl: "/placeholder.svg",
    subscribers: "100K",
    totalViews: "1M",
  };

  const videos = [
    {
      id: "1",
      title: "Latest Smartphone Review",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1719937206589-d13b6b008196?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8",
      views: "10K",
      uploadedAt: "2 days ago",
    },
    {
      id: "2",
      title: "Unboxing the New Laptop",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1719937206589-d13b6b008196?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8",
      views: "5K",
      uploadedAt: "1 week ago",
    },
    {
      id: "3",
      title: "Smart Home Devices Comparison",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1719937206589-d13b6b008196?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8",
      views: "15K",
      uploadedAt: "3 days ago",
    },
    {
      id: "4",
      title: "Top 10 Tech Gadgets of 2023",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1719937206589-d13b6b008196?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8",
      views: "20K",
      uploadedAt: "5 days ago",
    },
    {
      id: "5",
      title: "Future of AI in Daily Life",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1719937206589-d13b6b008196?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8",
      views: "30K",
      uploadedAt: "1 day ago",
    },
    {
      id: "6",
      title: "Building a Gaming PC in 2023",
      thumbnailUrl:
        "https://images.unsplash.com/photo-1719937206589-d13b6b008196?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3&ixid=M3wxMjA3fDF8MHxmZWF0dXJlZC1waG90b3MtZmVlZHwxfHx8ZW58MHx8fHx8",
      views: "25K",
      uploadedAt: "4 days ago",
    },
  ];

  return { channel, videos };
}

export default async function ChannelPage({}: { params: { slug: string } }) {
  const { channel } = getChannelData();

  const cookieStore = await cookies();
  const authHeader = cookieStore.get("Authentication");
  console.log(authHeader);

  if (!authHeader?.value) return;

  const data = await getChannelForUser(authHeader?.value);
  console.log("datadata", data);

  return (
    <div className="min-h-screen bg-indigo-50">
      <Navbar isHome />
      <EnhancedChannel channel={channel} joinCode={channel.joinCode} />
      <main className="container mx-auto px-4 py-8">
        <h2 className="text-3xl font-bold mb-6 text-indigo-800">
          Latest Uploads
        </h2>
        {/* <VideoGrid videos={videos} /> */}
      </main>
    </div>
  );
}
