"use client";
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';

export default function TrackingTimeline({ events }: { events: any[] }) {
  if (!events || events.length === 0) return null;

  return (
    <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 py-4">
      {events.map((event, index) => (
        <motion.div 
          key={index} 
          initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}
          className="relative pl-6"
        >
          {/* Timeline Dot */}
          <span className="absolute -left-[17px] top-1 bg-white rounded-full">
            {index === events.length - 1 ? (
              <CheckCircle2 className="w-8 h-8 text-[#FF5722] bg-white" />
            ) : (
              <Circle className="w-8 h-8 text-gray-300 bg-white" />
            )}
          </span>
          <div>
            <p className="text-sm font-bold text-[#0F3B66]">{event.status}</p>
            <p className="text-gray-600 text-sm">{event.title}</p>
            <p className="text-xs text-gray-400 mt-1">{new Date(event.date).toLocaleString()}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
