import type { FormRule } from "@/types";

import { XCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

interface FormRuleProps {
  rule: FormRule;
  onChange: (id: number, field: keyof FormRule, value: string | number) => void;
  onRemove: (id: number) => void;
}

export function FormRuleComponent({ rule, onChange, onRemove }: FormRuleProps) {
  return (
    <Card className="p-4 mb-4 bg-gray-50">
      <div className="flex justify-between items-start">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full">
          <div className="space-y-2">
            <Label htmlFor={`joint-${rule.id}`}>Joint/Connection</Label>
            {/* TODO: Fix this! */}
            {/* <Select
              value={rule.joint_name}
              onValueChange={(value) => onChange(rule.id, 'joint_name', value)}
            >
              <SelectTrigger id={`joint-${rule.id}`}>
                <SelectValue placeholder="Select Joint" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Select Joint</SelectItem>
                <SelectItem value="leftElbow">Left Elbow</SelectItem>
                <SelectItem value="rightElbow">Right Elbow</SelectItem>
                <SelectItem value="leftKnee">Left Knee</SelectItem>
                <SelectItem value="rightKnee">Right Knee</SelectItem>
                <SelectItem value="leftHip">Left Hip</SelectItem>
                <SelectItem value="rightHip">Right Hip</SelectItem>
                <SelectItem value="back">Back</SelectItem>
                <SelectItem value="shoulders">Shoulders</SelectItem>
              </SelectContent>
            </Select> */}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`min-angle-${rule.id}`}>Min Angle</Label>
            <Input
              id={`min-angle-${rule.id}`}
              type="number"
              min={0}
              max={180}
              value={rule.min_angle}
              onChange={(e) =>
                onChange(rule.id, "min_angle", parseInt(e.target.value))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`max-angle-${rule.id}`}>Max Angle</Label>
            <Input
              id={`max-angle-${rule.id}`}
              type="number"
              min={0}
              max={180}
              value={rule.max_angle}
              onChange={(e) =>
                onChange(rule.id, "max_angle", parseInt(e.target.value))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`feedback-${rule.id}`}>Feedback Message</Label>
            <Input
              id={`feedback-${rule.id}`}
              placeholder="e.g., Bend your knees more"
              value={rule.feedback}
              onChange={(e) => onChange(rule.id, "feedback", e.target.value)}
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(rule.id)}
          className="ml-2"
        >
          <XCircle className="h-5 w-5 text-destructive" />
        </Button>
      </div>
    </Card>
  );
}
