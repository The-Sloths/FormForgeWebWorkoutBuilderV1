import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function MockDashboard() {
  return (
    <div className="flex flex-col p-6 space-y-6 text-foreground">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl">Hi Martin!</h1>
        <Card className="bg-card text-card-foreground border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$2137000</div>
          </CardContent>
        </Card>
      </div>

      {/* Latest Messages */}
      <Card className="bg-card text-card-foreground border h-40">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Latest Messages</CardTitle>
        </CardHeader>
        <CardContent>{/* Message content area */}</CardContent>
      </Card>

      {/* Bottom Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-60">
        {/* Training Plans */}
        <Card className="bg-card text-card-foreground border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your trainin plans</CardTitle>
          </CardHeader>
          <CardContent>{/* Training plans content area */}</CardContent>
        </Card>

        {/* Your Trainees */}
        <Card className="bg-card text-card-foreground border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Yout trainess</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            {/* Placeholder Trainee Tiles */}
            <div className="flex items-center space-x-4 p-2 border rounded-md">
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                OW
              </div>
              {/* Name */}
              <div>Obi Wan Kenobi</div>
            </div>
            <div className="flex items-center space-x-4 p-2 border rounded-md">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                LS
              </div>
              <div>Luke Skywalker</div>
            </div>
            <div className="flex items-center space-x-4 p-2 border rounded-md">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                HS
              </div>
              <div>Han Solo</div>
            </div>
            <div className="flex items-center space-x-4 p-2 border rounded-md">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                LD
              </div>
              <div>Leo Depope</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
